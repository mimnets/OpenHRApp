/// <reference path="../pb_data/types.d.ts" />

console.log("[SETUP] Checking collections setup...");

// Helper function to check if collection exists
function collectionExists(name) {
    try {
        $app.findCollectionByNameOrId(name);
        return true;
    } catch (e) {
        return false;
    }
}

// Create upgrade_requests collection if it doesn't exist
if (!collectionExists("upgrade_requests")) {
    console.log("[SETUP] Creating 'upgrade_requests' collection...");

    const collection = new Collection({
        name: "upgrade_requests",
        type: "base",
        schema: [
            {
                name: "organization_id",
                type: "relation",
                required: true,
                options: {
                    collectionId: "", // Will be set below
                    cascadeDelete: false,
                    minSelect: null,
                    maxSelect: 1,
                    displayFields: ["name"]
                }
            },
            {
                name: "request_type",
                type: "select",
                required: true,
                options: {
                    maxSelect: 1,
                    values: ["DONATION", "TRIAL_EXTENSION", "AD_SUPPORTED"]
                }
            },
            {
                name: "status",
                type: "select",
                required: true,
                options: {
                    maxSelect: 1,
                    values: ["PENDING", "APPROVED", "REJECTED"]
                }
            },
            {
                name: "donation_amount",
                type: "number",
                required: false,
                options: {
                    min: 0,
                    max: null,
                    noDecimal: false
                }
            },
            {
                name: "donation_tier",
                type: "text",
                required: false,
                options: {
                    min: null,
                    max: 50,
                    pattern: ""
                }
            },
            {
                name: "donation_reference",
                type: "text",
                required: false,
                options: {
                    min: null,
                    max: 500,
                    pattern: ""
                }
            },
            {
                name: "donation_screenshot",
                type: "file",
                required: false,
                options: {
                    mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
                    thumbs: ["100x100"],
                    maxSelect: 1,
                    maxSize: 5242880 // 5MB
                }
            },
            {
                name: "extension_reason",
                type: "text",
                required: false,
                options: {
                    min: null,
                    max: 1000,
                    pattern: ""
                }
            },
            {
                name: "extension_days",
                type: "number",
                required: false,
                options: {
                    min: 1,
                    max: 365,
                    noDecimal: true
                }
            },
            {
                name: "admin_notes",
                type: "text",
                required: false,
                options: {
                    min: null,
                    max: 2000,
                    pattern: ""
                }
            },
            {
                name: "processed_by",
                type: "relation",
                required: false,
                options: {
                    collectionId: "", // Will be set below
                    cascadeDelete: false,
                    minSelect: null,
                    maxSelect: 1,
                    displayFields: ["name"]
                }
            },
            {
                name: "processed_at",
                type: "date",
                required: false,
                options: {}
            }
        ],
        indexes: [],
        listRule: '@request.auth.role = "SUPER_ADMIN" || organization_id = @request.auth.organization_id',
        viewRule: '@request.auth.role = "SUPER_ADMIN" || organization_id = @request.auth.organization_id',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.role = "SUPER_ADMIN"',
        deleteRule: '@request.auth.role = "SUPER_ADMIN"'
    });

    try {
        // Get organization collection ID for relation
        const orgsCollection = $app.findCollectionByNameOrId("organizations");
        const usersCollection = $app.findCollectionByNameOrId("users");

        // Update relation fields with correct collection IDs
        collection.schema.forEach(field => {
            if (field.name === "organization_id") {
                field.options.collectionId = orgsCollection.id;
            }
            if (field.name === "processed_by") {
                field.options.collectionId = usersCollection.id;
            }
        });

        $app.save(collection);
        console.log("[SETUP] 'upgrade_requests' collection created successfully!");
    } catch (err) {
        console.error("[SETUP] Failed to create 'upgrade_requests' collection:", err.toString());
    }
} else {
    console.log("[SETUP] 'upgrade_requests' collection already exists");
}

// Update organizations collection to add new fields if they don't exist
try {
    const orgsCollection = $app.findCollectionByNameOrId("organizations");
    let needsUpdate = false;

    // Check if ad_consent field exists
    const hasAdConsent = orgsCollection.schema.some(f => f.name === "ad_consent");
    if (!hasAdConsent) {
        console.log("[SETUP] Adding 'ad_consent' field to organizations...");
        orgsCollection.schema.push({
            name: "ad_consent",
            type: "bool",
            required: false,
            options: {}
        });
        needsUpdate = true;
    }

    // Check if subscription_expires field exists
    const hasSubExpires = orgsCollection.schema.some(f => f.name === "subscription_expires");
    if (!hasSubExpires) {
        console.log("[SETUP] Adding 'subscription_expires' field to organizations...");
        orgsCollection.schema.push({
            name: "subscription_expires",
            type: "date",
            required: false,
            options: {}
        });
        needsUpdate = true;
    }

    // Check if subscription_status has AD_SUPPORTED option
    const statusField = orgsCollection.schema.find(f => f.name === "subscription_status");
    if (statusField && statusField.options && statusField.options.values) {
        if (!statusField.options.values.includes("AD_SUPPORTED")) {
            console.log("[SETUP] Adding 'AD_SUPPORTED' to subscription_status options...");
            statusField.options.values.push("AD_SUPPORTED");
            needsUpdate = true;
        }
    }

    if (needsUpdate) {
        $app.save(orgsCollection);
        console.log("[SETUP] Organizations collection updated!");
    }
} catch (err) {
    console.error("[SETUP] Failed to update organizations collection:", err.toString());
}

console.log("[SETUP] Collection setup complete!");
