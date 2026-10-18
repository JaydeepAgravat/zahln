import type { ScreenName } from '@/content/types';

export type DeviceVideo = { mp4: string; webm: string; poster: string };

/**
 * A CSS phone (not a screenshot of a phone) around a real app screen cropped from docs/screenshots.
 *
 * VIDEO SLOT: pass `video` once the simulator recordings exist (Day 9 task C: 5–8 s loops, H.264 MP4 + WebM at
 * ~2.5 Mbps, poster frame). The <video> gets no src until the runtime sees it near the viewport (data-src),
 * plays muted inline, and pauses off-screen or when motion is paused.
 */
export function DeviceFrame({
  screen,
  alt,
  platform,
  video,
  className = '',
}: {
  screen: ScreenName;
  alt: string;
  platform: 'ios' | 'android';
  video?: DeviceVideo;
  className?: string;
}) {
  return (
    <div className={`device device-${platform} w-full max-w-[236px] ${className}`}>
      <div className="device-screen">
        {video ? (
          <video
            className="h-full w-full object-cover object-top"
            poster={video.poster}
            muted
            loop
            playsInline
            preload="none"
            aria-label={alt}
            data-video=""
          >
            <source data-src={video.webm} type="video/webm" />
            <source data-src={video.mp4} type="video/mp4" />
          </video>
        ) : (
          <picture>
            <source type="image/avif" srcSet={`/screens/${screen}.avif`} />
            <img
              src={`/screens/${screen}.webp`}
              alt={alt}
              width={460}
              height={996}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top"
            />
          </picture>
        )}
      </div>
    </div>
  );
}
