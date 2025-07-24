import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { useAtom, useSetAtom } from 'jotai';
import { Copy, FolderOpen, ImageOff, LoaderCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  writeFiles,
  writeImageBase64,
  writeText,
} from 'tauri-plugin-clipboard-api';
import { deleteClipItemAtom, updateClipItemAtom } from '~/atom/clip-items';
import { writeToClipboardPendingAtom } from '~/atom/primitive';
import { Button, Textarea, TooltipButton } from '~/components';
import { useBoolean, useOnceEffect, useT } from '~/hooks';
import type { ClipItem, FilesClipItem } from '~/types';
import { cardBgCls, cn, scrollBarCls } from '~/utils/cn';
import { fmtDateDistance, fmtFullDate } from '~/utils/common';
import { getClipImageByID } from '~/utils/db';

export function Item(props: { clipItem: ClipItem }) {
  const { clipItem } = props;

  const t = useT();
  const [writeToClipboardPending, setWriteToClipboardPending] = useAtom(
    writeToClipboardPendingAtom,
  );
  const deleteClipItem = useSetAtom(deleteClipItemAtom);
  const deleteClipItemPending = useBoolean();

  const { id, type, value, date } = clipItem;
  const fullDate = fmtFullDate(date);

  const handleCopy = async () => {
    try {
      setWriteToClipboardPending(true);
      if (type === 'text') {
        await writeText(value);
      } else if (type === 'image') {
        await writeImageBase64(value);
      } else if (type === 'files') {
        await writeFiles(value);
      }
      window.__pastly.justCopiedItem = {
        value: value.toString(),
        timestamp: Date.now(),
      };
    } finally {
      setWriteToClipboardPending(false);
    }
  };

  const handleDelete = async () => {
    try {
      deleteClipItemPending.on();
      await deleteClipItem(clipItem.id);
    } finally {
      deleteClipItemPending.off();
    }
  };

  return (
    <div className="h-full w-full px-4 py-2">
      <div className="h-full w-full flex flex-col rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div
          className={cn(
            'h-[50px] rounded-tl-lg rounded-tr-lg flex justify-between items-center px-4 text-background',
            type === 'text' && 'bg-yellow-500',
            type === 'image' && 'bg-green-500',
            type === 'files' && 'bg-cyan-500',
          )}
        >
          <div>
            <div className="text-lg font-semibold">{t(type)}</div>
            <DateDistanceDisplay date={date} fullDate={fullDate} />
          </div>
          <div>
            <ItemActionButton
              type={type}
              onClick={handleCopy}
              disabled={writeToClipboardPending}
            >
              {writeToClipboardPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Copy className="text-background" />
              )}
            </ItemActionButton>
            <ItemActionButton type={type} onClick={handleDelete}>
              {deleteClipItemPending.value ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 className="text-background" />
              )}
            </ItemActionButton>
          </div>
        </div>
        {type === 'text' && <TextItem value={value} />}
        {type === 'image' && <ImageItem id={id} fullDate={fullDate} />}
        {type === 'files' && <FilesItem clipItem={clipItem} />}
      </div>
    </div>
  );
}

function TextItem(props: { value: string }) {
  const { value } = props;

  return (
    <Textarea
      className={cn(
        'overflow-y-auto overflow-x-hidden resize-none flex-1 h-px w-full p-2 rounded-none rounded-bl-lg rounded-br-lg whitespace-break-spaces overscroll-contain focus-visible:ring-0',
        cardBgCls(),
      )}
      readOnly
      value={value}
      tabIndex={-1}
    />
  );
}

const iamgeContainerCls = () => {
  return 'flex-1 h-px w-full border rounded-bl-lg rounded-br-lg';
};

function ImageItem(props: { id: string; fullDate: string }) {
  const { id, fullDate } = props;

  const [base64, setBase64] = useState('');
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const clipImage = await getClipImageByID(id);
        setBase64(clipImage.value);
      } finally {
        setImageLoading(false);
      }
    };
    fetchImage();
  }, [id]);

  if (!imageLoading && !base64) {
    return (
      <div
        className={cn(iamgeContainerCls(), 'flex justify-center items-center')}
        title={`image copied at ${fullDate}`}
      >
        <ImageOff className="text-muted-foreground" />
      </div>
    );
  }

  if (imageLoading) {
    return (
      <div
        className={cn(iamgeContainerCls(), 'flex justify-center items-center')}
      >
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  return (
    <img
      className={cn(iamgeContainerCls(), 'object-contain')}
      src={`data:image/png;base64,${base64}`}
      alt={`image copied at ${fullDate}`}
    />
  );
}

function FilesItem(props: { clipItem: FilesClipItem }) {
  const { clipItem } = props;
  const { id, value, type } = clipItem;

  const deleteClipItem = useSetAtom(deleteClipItemAtom);
  const updateClipItem = useSetAtom(updateClipItemAtom);

  const handleReealInDirError = (path: string) => {
    if (type !== 'files') {
      return;
    }
    const newFiles = value.filter((file) => file !== path);
    if (newFiles.length === 0) {
      deleteClipItem(id);
      return;
    }
    updateClipItem({ ...clipItem, value: newFiles });
  };

  return (
    <div
      className={cn(
        'flex-1 h-px w-full border rounded-bl-lg rounded-br-lg overflow-y-auto overflow-x-hidden',
        scrollBarCls(),
      )}
    >
      {value.map((file) => {
        return (
          <div
            key={file}
            className="px-2 py-1 border-b last:border-b-0 flex items-center gap-1"
          >
            <div
              className="truncate flex-1 select-text cursor-text"
              title={file}
            >
              {file}
            </div>
            <RevealInDirButton path={file} onError={handleReealInDirError} />
          </div>
        );
      })}
    </div>
  );
}

function DateDistanceDisplay(props: { date: number; fullDate: string }) {
  const { date, fullDate } = props;

  const { i18n } = useTranslation();
  const [distance, setDistance] = useState('');

  useOnceEffect(() => {
    setInterval(() => {
      setDistance(fmtDateDistance(date, i18n.language));
    }, 1000 * 60);
  });

  useEffect(() => {
    setDistance(fmtDateDistance(date, i18n.language));
  }, [date, i18n.language]);

  return (
    <div className="text-sm" title={fullDate}>
      {distance}
    </div>
  );
}

function ItemActionButton(
  props: React.PropsWithChildren<{
    onClick: () => void;
    type: string;
    disabled?: boolean;
  }>,
) {
  const { onClick, children, type, disabled } = props;

  return (
    <Button
      className={cn(
        type === 'text' && 'hover:bg-yellow-400',
        type === 'image' && 'hover:bg-green-400',
        type === 'files' && 'hover:bg-cyan-400',
      )}
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      tabIndex={-1}
    >
      {children}
    </Button>
  );
}

function RevealInDirButton(props: {
  path: string;
  onError: (path: string) => void;
}) {
  const { path, onError } = props;
  const t = useT();

  const name = (() => {
    if (PLATFORM === 'darwin') {
      return t('finder');
    }
    if (PLATFORM === 'win32') {
      return t('fileExplorer');
    }
    return t('fileManager');
  })();

  const handleClick = async () => {
    try {
      await revealItemInDir(path);
    } catch (error) {
      onError(path);
      throw error;
    }
  };

  return (
    <TooltipButton
      tooltip={t('revealInDir', { name })}
      onClick={handleClick}
      tabIndex={-1}
    >
      <FolderOpen />
    </TooltipButton>
  );
}
