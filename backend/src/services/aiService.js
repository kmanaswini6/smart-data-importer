const { Groq } = require('groq-sdk');

const groq = new Groq();

/**
 * Evaluates raw uploaded CSV column headers against our expected system database schema
 * and maps the alignments dynamically using an LLM.
 */
async function predictSchemaMapping(rawHeaders, targetFields) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('AI Engine missing environment validation: GROQ_API_KEY is not defined.');
    }

    const systemPrompt = `You are an industrial data integration engine. 
Your sole task is to map a list of raw user-uploaded CSV headers to our known system database target fields.

Target Fields available in the system:
${JSON.stringify(targetFields)}

You must return a raw JSON object where the keys are the target fields, and the values are the matching strings from the user's raw headers.
If a target field has no reasonable match, return null for that key.
Do not provide text explanations, markdowns, or assumptions. Return ONLY the raw JSON object.`;

    const userPrompt = `Map these raw CSV headers: ${JSON.stringify(rawHeaders)}`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            // FIXED: Switched to the exact official production model name on Groq
            model: 'llama-3.3-70b-versatile',
            temperature: 0.0,
            response_format: { type: 'json_object' }
        });

        const rawResponse = chatCompletion.choices[0]?.message?.content;
        return JSON.parse(rawResponse);
    } catch (error) {
        console.error('AI Schema mapping prediction collapsed:', error);
        throw new Error(`AI Engine mapping failure: ${error.message}`);
    }
}

module.exports = {
    predictSchemaMapping
};