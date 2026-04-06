import { useCdnData } from '../cdn/queries';
import { ICON_URL } from '../cdn/loader';

interface Props {
  id?: number;
  size?: number;
  title?: string;
}

/** Renders a Project Gorgon icon from the current CDN version. */
export function Icon({ id, size = 20, title }: Props) {
  const cdn = useCdnData();
  if (!id || !cdn.data) return null;
  return (
    <img
      src={ICON_URL(cdn.data.version, id)}
      alt=""
      title={title}
      width={size}
      height={size}
      loading="lazy"
      style={{ verticalAlign: 'middle', imageRendering: 'pixelated' }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
    />
  );
}
