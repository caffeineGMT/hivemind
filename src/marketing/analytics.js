// Analytics & Tracking Infrastructure
// Integrates Google Analytics 4, Mixpanel, conversion tracking

/**
 * Initialize Google Analytics 4
 */
export function initGA4(measurementId) {
  if (typeof window === 'undefined') return;

  // Load GA4 script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: true,
    anonymize_ip: true,
  });
}

/**
 * Track page views
 */
export function trackPageView(path, title) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: title,
      page_location: window.location.href,
      page_path: path,
    });
  }

  // Also track in Mixpanel
  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.track('Page Viewed', {
      path,
      title,
      url: window.location.href,
    });
  }
}

/**
 * Track conversion events
 */
export function trackConversion(eventName, eventData = {}) {
  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...eventData,
      event_category: 'conversion',
      timestamp: new Date().toISOString(),
    });
  }

  // Mixpanel
  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.track(eventName, eventData);
  }

  console.log(`[Analytics] Conversion: ${eventName}`, eventData);
}

/**
 * Track user signup
 */
export function trackSignup(userId, userData = {}) {
  trackConversion('sign_up', {
    method: userData.method || 'email',
    source: userData.source,
  });

  // Set user ID in analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      user_id: userId,
    });
  }

  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.identify(userId);
    window.mixpanel.people.set({
      $email: userData.email,
      $created: new Date().toISOString(),
      plan: userData.plan || 'free',
    });
  }
}

/**
 * Track trial start
 */
export function trackTrialStart(plan, userId) {
  trackConversion('begin_trial', {
    plan,
    user_id: userId,
    value: plan === 'pro' ? 199 : plan === 'enterprise' ? 999 : 49,
    currency: 'USD',
  });
}

/**
 * Track subscription purchase
 */
export function trackPurchase(plan, amount, userId) {
  trackConversion('purchase', {
    transaction_id: `sub_${Date.now()}`,
    value: amount,
    currency: 'USD',
    items: [
      {
        item_id: `plan_${plan}`,
        item_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        price: amount,
        quantity: 1,
      },
    ],
  });

  // Track in Mixpanel
  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.track('Subscription Started', {
      plan,
      amount,
      user_id: userId,
    });

    window.mixpanel.people.set({
      plan,
      ltv: amount,
    });
  }
}

/**
 * Track button clicks
 */
export function trackClick(buttonName, location, additionalData = {}) {
  trackConversion('button_click', {
    button_name: buttonName,
    location,
    ...additionalData,
  });
}

/**
 * Track form submissions
 */
export function trackFormSubmit(formName, formData = {}) {
  trackConversion('form_submit', {
    form_name: formName,
    ...formData,
  });
}

/**
 * Track outbound links
 */
export function trackOutboundLink(url, label) {
  trackConversion('outbound_link', {
    url,
    label,
  });
}

/**
 * Track video plays
 */
export function trackVideoPlay(videoTitle, videoUrl) {
  trackConversion('video_play', {
    video_title: videoTitle,
    video_url: videoUrl,
  });
}

/**
 * Track search queries
 */
export function trackSearch(query, results) {
  trackConversion('search', {
    search_term: query,
    results_count: results,
  });
}

/**
 * Track acquisition channel
 */
export function identifyChannel() {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source');
  const utmMedium = urlParams.get('utm_medium');
  const utmCampaign = urlParams.get('utm_campaign');
  const ref = document.referrer;

  let channel = 'direct';

  if (utmSource) {
    channel = `${utmSource}${utmMedium ? `/${utmMedium}` : ''}`;
  } else if (ref) {
    if (ref.includes('google.com')) channel = 'google/organic';
    else if (ref.includes('facebook.com')) channel = 'facebook/social';
    else if (ref.includes('twitter.com') || ref.includes('t.co')) channel = 'twitter/social';
    else if (ref.includes('linkedin.com')) channel = 'linkedin/social';
    else if (ref.includes('reddit.com')) channel = 'reddit/social';
    else if (ref.includes('producthunt.com')) channel = 'producthunt/referral';
    else channel = 'referral';
  }

  // Store channel in sessionStorage
  if (!sessionStorage.getItem('acquisition_channel')) {
    sessionStorage.setItem('acquisition_channel', channel);
    sessionStorage.setItem('landing_page', window.location.pathname);

    // Track channel in analytics
    trackConversion('channel_identified', {
      channel,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      referrer: ref,
    });
  }

  return channel;
}

/**
 * A/B test tracking
 */
export function trackExperiment(experimentName, variant) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'experiment_impression', {
      experiment_id: experimentName,
      variant_id: variant,
    });
  }

  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.track('Experiment Viewed', {
      experiment: experimentName,
      variant,
    });
  }
}

/**
 * Track funnel steps
 */
export function trackFunnelStep(funnelName, stepName, stepNumber) {
  trackConversion('funnel_step', {
    funnel_name: funnelName,
    step_name: stepName,
    step_number: stepNumber,
  });
}

/**
 * Custom event tracking
 */
export function trackCustomEvent(eventName, properties = {}) {
  trackConversion(eventName, properties);
}

/**
 * Initialize Mixpanel
 */
export function initMixpanel(token) {
  if (typeof window === 'undefined') return;

  (function (f, b) {
    if (!b.__SV) {
      var e, g, i, h;
      window.mixpanel = b;
      b._i = [];
      b.init = function (e, f, c) {
        function g(a, d) {
          var b = d.split('.');
          2 == b.length && ((a = a[b[0]]), (d = b[1]));
          a[d] = function () {
            a.push([d].concat(Array.prototype.slice.call(arguments, 0)));
          };
        }
        var a = b;
        'undefined' !== typeof c ? (a = b[c] = []) : (c = 'mixpanel');
        a.people = a.people || [];
        a.toString = function (a) {
          var d = 'mixpanel';
          'mixpanel' !== c && (d += '.' + c);
          a || (d += ' (stub)');
          return d;
        };
        a.people.toString = function () {
          return a.toString(1) + '.people (stub)';
        };
        i =
          'disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove'.split(
            ' '
          );
        for (h = 0; h < i.length; h++) g(a, i[h]);
        var j = 'set set_once union unset remove delete'.split(' ');
        a.get_group = function () {
          function b(c) {
            d[c] = function () {
              call2_args = arguments;
              call2 = [c].concat(Array.prototype.slice.call(call2_args, 0));
              a.push([e, call2]);
            };
          }
          for (
            var d = {},
              e = ['get_group'].concat(Array.prototype.slice.call(arguments, 0)),
              c = 0;
            c < j.length;
            c++
          )
            b(j[c]);
          return d;
        };
        b._i.push([e, f, c]);
      };
      b.__SV = 1.2;
    }
  })(document, window.mixpanel || []);

  window.mixpanel.init(token, {
    debug: false,
    track_pageview: true,
    persistence: 'localStorage',
  });
}

/**
 * Revenue tracking
 */
export function trackRevenue(amount, currency = 'USD', metadata = {}) {
  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.people.track_charge(amount, {
      currency,
      ...metadata,
    });
  }

  trackConversion('revenue', {
    value: amount,
    currency,
    ...metadata,
  });
}

/**
 * Initialize all analytics
 */
export function initAnalytics(config = {}) {
  if (config.ga4MeasurementId) {
    initGA4(config.ga4MeasurementId);
  }

  if (config.mixpanelToken) {
    initMixpanel(config.mixpanelToken);
  }

  // Identify channel on page load
  identifyChannel();

  console.log('[Analytics] Initialized successfully');
}
