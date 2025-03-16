import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
    count: number;
    children: React.ReactNode;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ count: _count, children, className }) => {
    return (
        <div className={`${styles.badgeContainer} ${className ?? ''}`}>
            {children}
            {/* {count > 0 && <span className={styles.badgeElement}>{count}</span>} */}
        </div>
    );
};

export default Badge;
