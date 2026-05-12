const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
};

/**
 * LoadingSpinner — indikator loading generik dengan animasi spin.
 *
 * @param {Object}  props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Ukuran spinner
 * @param {string}  [props.className='']     - Class tambahan
 */
export default function LoadingSpinner({ size = 'md', className = '' }) {
    const sizeClass = sizeClasses[size] ?? sizeClasses.md;

    return (
        <div
            role="status"
            aria-label="Loading"
            className={`inline-block rounded-full border-4 border-ocean-200 border-t-ocean-500 animate-spin ${sizeClass} ${className}`}
        />
    );
}
