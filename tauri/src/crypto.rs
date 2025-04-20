use aes_gcm::{Aes256Gcm, Key, Nonce};
use anyhow::Result;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;

pub fn compute_pin_hash(pin: &str) -> String {
	use sha2::Digest;

	let mut hasher = Sha256::new();
	hasher.update(pin);
	let result = hasher.finalize();
	hex::encode(result)
}

pub fn derive_aes_key(pin: &str) -> Key<Aes256Gcm> {
	let mut key = [0u8; 32];
	let salt = b"pastly";
	pbkdf2_hmac::<Sha256>(pin.as_bytes(), salt, 100000, &mut key);
	*Key::<Aes256Gcm>::from_slice(&key)
}

pub fn encrypt_content(
	content: &str,
	key: &Key<Aes256Gcm>,
) -> Result<(String, String)> {
	use aes_gcm::aead::{Aead, AeadCore, KeyInit, OsRng};

	let cipher = Aes256Gcm::new(key);
	let iv = Aes256Gcm::generate_nonce(&mut OsRng);
	let ciphertext = cipher
		.encrypt(&iv, content.as_bytes())
		.map_err(|_| anyhow::anyhow!("Cannot encrypt content to be sent"))?;

	Ok((BASE64.encode(ciphertext), BASE64.encode(iv)))
}

pub fn decrypt_content(
	ciphertext: &str,
	iv: &str,
	key: &Key<Aes256Gcm>,
) -> Result<String> {
	use aes_gcm::aead::{Aead, KeyInit};

	let cipher = Aes256Gcm::new(key);
	let ciphertext = BASE64.decode(ciphertext)?;
	let decoded_iv = BASE64.decode(iv)?;
	let plaintext = cipher
		.decrypt(Nonce::from_slice(&decoded_iv), &ciphertext[..])
		.map_err(|_| anyhow::anyhow!("Failed to decrypt content"))?;
	let content = String::from_utf8(plaintext)?;

	Ok(content)
}
