import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { matchIdParamSchema } from "../validation/matches.js";
import { createCommentarySchema, listCommentaryQuerySchema } from "../validation/commentary.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";

const MAX_LIMIT = 100;

export const commentaryRouter = Router({ mergeParams: true });

// GET /matches/:id/commentary - List commentary for a match
commentaryRouter.get('/', async (req, res) => {

    // Validate path parameters and query parameters
    const paramsResult = matchIdParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
        return res.status(400).json({ error: 'Invalid match ID.', details: paramsResult.error.issues });
    }

    // Validate query parameters
    const queryResult = listCommentaryQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
        return res.status(400).json({ error: 'Invalid query parameters.', details: queryResult.error.issues });
    }

    try {
        const { id: matchId } = paramsResult.data;
        const { limit = 10 } = queryResult.data;

        const safeLimit = Math.min(limit, MAX_LIMIT);

        const results = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .orderBy(desc(commentary.createdAt))
            .limit(safeLimit);

        res.status(200).json({ data: results });
    } catch (error) {
        console.error('Failed to fetch commentary:', error);
        res.status(500).json({ error: 'Failed to fetch commentary.' });
    }
});

// POST /matches/:id/commentary - Create a new commentary entry for a match
commentaryRouter.post('/', async (req, res) => {

    // Validate path parameters and request body
    const paramsResult = matchIdParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
        return res.status(400).json({ error: 'Invalid match ID.', details: paramsResult.error.issues });
    }

    // Validate request body
    const bodyResult = createCommentarySchema.safeParse(req.body);

    if (!bodyResult.success) {
        return res.status(400).json({ error: 'Invalid commentary payload.', details: bodyResult.error.issues });
    }

    try {
        const { minute, ...rest } = bodyResult.data;
        const [result] = await db.insert(commentary).values({
            matchId: paramsResult.data.id,
            minute,
            ...rest
        }).returning();

        if(res.app.locals.broadcastCommentary) {
            res.app.locals.broadcastCommentary(result.matchId, result);
        }

        res.status(201).json({ data: result });
    } catch (error) {
        console.error('Failed to create commentary:', error);
        res.status(500).json({ error: 'Failed to create commentary.' });
    }
});