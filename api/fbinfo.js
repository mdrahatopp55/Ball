import { ApifyClient } from "apify-client";

export default async function handler(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    // Allow only GET
    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            message: "Only GET method allowed",
        });
    } // <-- FIXED missing bracket

    const pageUrl = req.query.url;

    if (!pageUrl) {
        return res.status(400).json({
            success: false,
            message: "Please provide URL. Example: /api/run?url=https://facebook.com/page",
        });
    }

    try {
        const client = new ApifyClient({
            token: "apify_api_lXQd5BhJyPBel2TLkPkfj2vCXgAgk13tfVt9", // Token Added ✔
        });

        const input = {
            startUrls: [{ url: pageUrl }],
        };

        // Run the actor
        const run = await client.actor("4Hv5RhChiaDk6iwad").call(input);

        // Fetch results
        const { items } = await client
            .dataset(run.defaultDatasetId)
            .listItems();

        // Response OK
        return res.status(200).json({
            success: true,
            input_url: pageUrl,
            items_count: items.length,
            data: items,
        });

    } catch (err) {
        console.error("Apify error:", err);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while running Apify actor",
            error: err.message,
        });
    }
}
