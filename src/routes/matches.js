import { Router } from "express";
import { createMatchSchema } from "../schemas/matchSchemas.js";
import { db } from "../db.js";
import { matches } from "../db/schema.js";
import {string} from "zod";

export const matchRouter = Router();

const MAX_LIMIT = 100;

// res = response, req = request
matchRouter.get('/',async (req,res)=>{
    const parsed = createMatchSchema.safeParse(req.body);

    if(!parsed.success){
        return res.status(400).json({error: 'Invalid query',details: parsed.error.details});
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);
    try{
        const data = await db
            .select()
            .from(matches)
            .orderBy((desc(matches.createdAt)))
            .limit(limit);

        res.json({data});
    }
    catch(err){
        res.status(500).json({error: 'Failed to fetch matches',details: err.message});
    }
})

matchRouter.post('/', async (req,res)=>{
    const parsed = createMatchSchema.safeParse(req.body);

    
    if(!parsed.success){
        return res.status(400).json({error: 'Invalid payload',details: parsed.error.details});
    }
    
    const {data:{startTime, endTime, homeScore, awayScore}} = parsed;
    try{
        // Here you would typically save the match to a database
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime),
        }).returning();

        res.status(201).json({data:event});
    }
    catch(err){
        res.status(500).json({error: 'Failed to create match',details: err.message});
    }
})