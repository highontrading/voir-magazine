'use client';

import { useState } from 'react';
import { isVideoFile, vimeoId, youTubeId } from '@/lib/utils';
import { PlayIcon } from './Icons';

export function VideoPlayer({ url, poster, title, autoStart }: { url: string; poster?: string; title: string; autoStart?: boolean }) {
  const [playing, setPlaying] = useState(!!autoStart);
  const yt = youTubeId(url);
  const vm = vimeoId(url);
  return (
    <div className="player">
      {playing ? (
        yt ? (
          <iframe src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : vm ? (
          <iframe src={`https://player.vimeo.com/video/${vm}?autoplay=1`} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        ) : isVideoFile(url) || url ? (
          <video src={url} poster={poster} controls autoPlay playsInline />
        ) : null
      ) : (
        <button className="player__poster" onClick={() => setPlaying(true)} aria-label={`Play ${title}`}>
          {poster ? <img src={poster} alt="" /> : null}
          <span className="player__big">
            <PlayIcon />
          </span>
        </button>
      )}
    </div>
  );
}
