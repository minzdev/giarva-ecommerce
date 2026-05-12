import { useState } from 'react';

/**
 * StarRating component — renders 5 stars (filled/empty) based on a rating prop.
 *
 * Props:
 *   rating      {number}   Current rating value (0–5)
 *   interactive {boolean}  Enable click-to-rate mode (default: false)
 *   onRate      {function} Callback called with the selected rating (1–5)
 *   size        {string}   "sm" | "md" | "lg" (default: "md")
 */
function StarRating({ rating = 0, interactive = false, onRate, size = 'md' }) {
    const [hovered, setHovered] = useState(null);

    const sizeClass = {
        sm: 'text-sm',
        md: 'text-xl',
        lg: 'text-3xl',
    }[size] ?? 'text-xl';

    const handleClick = (index) => {
        if (interactive && typeof onRate === 'function') {
            onRate(index + 1);
        }
    };

    const handleMouseEnter = (index) => {
        if (interactive) setHovered(index);
    };

    const handleMouseLeave = () => {
        if (interactive) setHovered(null);
    };

    const stars = Array.from({ length: 5 }, (_, i) => {
        // Determine fill: use hovered position when hovering, otherwise use rating
        const threshold = hovered !== null ? hovered : rating - 1;
        const isFilled = i <= threshold;

        const colorClass = isFilled ? 'text-yellow-400' : 'text-gray-300';
        const char = isFilled ? '★' : '☆';

        if (interactive) {
            return (
                <button
                    key={i}
                    type="button"
                    aria-label={`Rate ${i + 1} out of 5`}
                    className={`${sizeClass} ${colorClass} leading-none transition-colors duration-100 focus:outline-none`}
                    onClick={() => handleClick(i)}
                    onMouseEnter={() => handleMouseEnter(i)}
                    onMouseLeave={handleMouseLeave}
                >
                    {char}
                </button>
            );
        }

        return (
            <span
                key={i}
                aria-hidden="true"
                className={`${sizeClass} ${colorClass} leading-none`}
            >
                {char}
            </span>
        );
    });

    return (
        <span
            className="inline-flex items-center gap-0.5"
            role={interactive ? 'group' : 'img'}
            aria-label={interactive ? 'Star rating selector' : `Rating: ${rating} out of 5`}
        >
            {stars}
        </span>
    );
}

export default StarRating;
