'use client';

import { useState } from 'react';
import { isVideoFile, vimeoId, youTubeId } from '@/lib/utils';
import { MediaField } from './MediaField';

/** Video or audio URL field with an inline player preview (YouTube, Vimeo, mp4/webm, mp3). */
export function PlayerField({ name, label, defaultValue = '', kind, hint }: { name: string; label: string; defaultValue?: string; kind: 'video' | 'audio'; hint?: string }) {
  const [url, setUrl] = useState(defaultValue);
  const yt = kind === 'video' ? youTubeId(url) : null;
  const vm = kind === 'video' ? vimeoId(url) : null;
  return (
    <div className="adm-field">
      <span className="adm-label">{label}</span>
      {kind === 'video' ? (
        yt ? (
          <div className="adm-player">
            <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title="YouTube preview" allow="encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        ) : vm ? (
          <div className="adm-player">
            <iframe src={`https://player.vimeo.com/video/${vm}`} title="Vimeo preview" allow="fullscreen; picture-in-picture" allowFullScreen />
          </div>
        ) : url && (isVideoFile(url) || url.startsWith('/media/')) ? (
          <div className="adm-player">
            <video key={url} src={url} controls preload="metadata" />
          </div>
        ) : (
          <div className="adm-player-empty">{url ? 'Preview unavailable for this URL — use a YouTube, Vimeo or .mp4 link.' : 'Paste a YouTube / Vimeo / .mp4 URL or upload a video file.'}</div>
        )
      ) : url ? (
        <audio key={url} className="adm-audio" src={url} controls preload="none" />
      ) : (
        <div className="adm-player-empty" style={{ aspectRatio: 'auto', padding: 18 }}>
          Paste an .mp3 URL or upload an audio file.
        </div>
      )}
      <MediaField name={name} value={url} onChange={setUrl} kind={kind} hidePreview />
      {hint && <span className="adm-hint">{hint}</span>}
    </div>
  );
}
