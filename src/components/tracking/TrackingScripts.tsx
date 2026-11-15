import Script from "next/script";

type Props = { fbPixelIds?: string[]; fbEvents?: string[]; slug?: string; ga4Id?: string; gtmId?: string; tiktokPixelId?: string };

/**
 * Facebook Pixel, GA4, GTM, TikTok. IDs come from Admin (a landing page can use its own Pixel).
 * The PageView event id is generated in the browser (window.__qfPv) so pages stay cacheable;
 * the Tracker sends the same id to the server → Conversions API → Facebook de-duplicates.
 */
export default function TrackingScripts({ fbPixelIds = [], fbEvents = [], slug, ga4Id, gtmId, tiktokPixelId }: Props) {
  const ids = fbPixelIds.filter((x) => /^\d{5,20}$/.test(x));
  const cfg = JSON.stringify({ ev: fbEvents, slug: slug || null });
  return (
    <>
      <Script id="qf-pv" strategy="afterInteractive">
        {`window.__qfPv=window.__qfPv||((self.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));window.__qfCfg=${cfg};`}
      </Script>
      {ids.length > 0 && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
window.__qfPv=window.__qfPv||Date.now()+'-'+Math.random().toString(36).slice(2);
${ids.map((id) => `fbq('init','${id}');`).join("")}${fbEvents.includes("PageView") ? "fbq('track','PageView',{},{eventID:window.__qfPv});" : ""}`}
        </Script>
      )}
      {ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="lazyOnload" />
          <Script id="ga4" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4Id}');`}
          </Script>
        </>
      )}
      {gtmId && (
        <Script id="gtm" strategy="lazyOnload">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}
      {tiktokPixelId && (
        <Script id="tiktok" strategy="lazyOnload">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktokPixelId}');ttq.page();}(window,document,'ttq');`}
        </Script>
      )}
    </>
  );
}
