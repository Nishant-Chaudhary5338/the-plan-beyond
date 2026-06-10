import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Avatar, toast } from '@/components/ui';

interface AvatarUploadProps {
  name: string;
  imageUrl?: string | null;
  /** Persisted through the normal draft → explicit-save model. */
  onChange: (url: string | null) => void;
}

const MAX_DIM = 256;
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Downscale a chosen image to a square-ish thumbnail and return a data URL.
 * Kept client-side and small so the avatar rides along in the contact payload
 * without a separate upload endpoint (A-P1.3).
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no-canvas'));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode-failed'));
    };
    img.src = url;
  });
}

export function AvatarUpload({ name, imageUrl, onChange }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('That image is too large (max 8 MB)');
      return;
    }
    try {
      onChange(await fileToDataUrl(file));
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  return (
    <div
      className="group relative size-20 shrink-0"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFile(e.dataTransfer.files[0]);
      }}
    >
      <Avatar name={name} imageUrl={imageUrl} size="lg" />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={imageUrl ? 'Change photo' : 'Add photo'}
        className={`absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 ${
          dragging ? 'opacity-100 ring-2 ring-ring' : 'opacity-0'
        }`}
      >
        <Camera className="size-5" aria-hidden="true" />
      </button>

      {imageUrl ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Remove photo"
          className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-surface text-muted opacity-0 ring-1 ring-line transition-opacity hover:text-danger focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
