// 🛠 SMTP DELIVERY WORKER
// Monitors the reports_queue and dispatches emails using PocketBase Mailer.
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    if (record.get("status") !== "PENDING") return;

    try {
        const meta = $app.settings().meta;
        const message = new MailerMessage({
            from: { address: meta.senderAddress, name: meta.senderName },
            to: [{ address: record.get("recipient_email") }],
            subject: record.get("subject"),
            html: record.get("html_content"),
        });
        
        $app.newMailClient().send(message);
        
        record.set("status", "SENT");
        record.set("sent_at", new Date().toISOString());
        $app.save(record);
        console.log(`[REPORTS_ENGINE] Sent ${record.get("type")} to ${record.get("recipient_email")}`);
    } catch (err) {
        console.error(`[REPORTS_ENGINE] Failure: ${err.toString()}`);
        record.set("status", "FAILED");
        record.set("error_message", err.toString());
        $app.save(record);
    }
}, "reports_queue");