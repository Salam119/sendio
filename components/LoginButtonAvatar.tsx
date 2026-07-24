import Image from 'next/image';
import styles from './LoginButtonAvatar.module.css';

export default function LoginButtonAvatar() {
  return (
    <span className={styles.scene} aria-hidden="true">
      <span className={styles.doorWrap}>
        <Image
          src="/avatars/login/door-frame.svg"
          alt=""
          width={34}
          height={44}
          className={styles.doorFrame}
        />
        <Image
          src="/avatars/login/door-leaf.svg"
          alt=""
          width={24}
          height={37}
          className={styles.doorLeaf}
        />
      </span>
    </span>
  );
}
