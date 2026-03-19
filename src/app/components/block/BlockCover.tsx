import styles from './BlockCover.module.css';

interface BlockCoverProps {
  src: string | null | undefined;
  alt?: string;
  placeholder?: string;
}

export function BlockCover({
  src,
  alt = '',
  placeholder = 'No cover',
}: BlockCoverProps) {
  return (
    <div className={styles.wrapper}>
      {src ? (
        <img src={src} alt={alt} className={styles.img} />
      ) : (
        <div className={styles.placeholder}>{placeholder}</div>
      )}
    </div>
  );
}
