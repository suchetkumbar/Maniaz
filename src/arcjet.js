import arcjet, {detectBot, shield, slidingWindow} from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJECT_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE'; // dry run by default, set ARCJET_MODE=LIVE to enable blocking actions

if(!arcjetKey) throw new Error('ARCJET_KEY environment variable is missing.'); // Ensure that the Arcjet key is provided, otherwise throw an error to prevent the application from running without security measures.

// Create 2 separate Arcjet instances for HTTP and WebSocket with different rate limits and rules if needed. This allows for more granular control over the security measures applied to different types of traffic.
export const httpArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode }),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', "CATEGORY:PREVIEW" ]}),
            slidingWindow({ mode: arcjetMode, interval: '10s', max: 50 }) // sliding window rule for HTTP traffic to stop connection spams
        ],
    }) : null;

export const wsArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode }),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', "CATEGORY:PREVIEW" ]}),
            slidingWindow({ mode: arcjetMode, interval: '2s', max: 5 })
        ],
    }) : null;

// Middleware function for Express.js to protect HTTP routes using the httpArcjet instance. This function checks incoming requests against the defined Arcjet rules and takes appropriate actions based on the decisions made by Arcjet, such as blocking requests that exceed rate limits or are identified as bots.
export function securityMiddleware() {
    return async (req, res, next) => {
        if(!httpArcjet) return next(); // if arcjet is not configured then skip the middleware and allow all requests to proceed

        try {
            const decision = await httpArcjet.protect(req);

            if(decision.isDenied()) {
                if(decision.reason.isRateLimit()) {
                    return res.status(429).json({ error: 'Too many requests.' });
                }

                return res.status(403).json({ error: 'Forbidden.' });
            }
        } catch (e) {
            console.error('Arcjet middleware error', e);
            return res.status(503).json({ error: 'Service Unavailable' });
        }

        next();
    }
}