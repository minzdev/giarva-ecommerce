import { Helmet } from 'react-helmet-async';

/**
 * SEOHelmet — wrapper around react-helmet-async for per-page meta tags.
 *
 * @param {string}  title       - Page title (rendered as <title> and og:title)
 * @param {string}  description - Meta description (rendered as meta description and og:description)
 * @param {string}  [keywords]  - Optional meta keywords
 * @param {string}  [ogImage]   - Optional og:image URL
 */
function SEOHelmet({ title, description, keywords, ogImage }) {
    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
            {keywords && <meta name="keywords" content={keywords} />}

            {/* Open Graph */}
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            {ogImage && <meta property="og:image" content={ogImage} />}
        </Helmet>
    );
}

export default SEOHelmet;
