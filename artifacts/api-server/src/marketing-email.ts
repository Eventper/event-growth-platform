import nodemailer from "nodemailer";
import Imap from "imap";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: "mail.privateemail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.MARKETING_EMAIL_USER || "",
      pass: process.env.MARKETING_EMAIL_PASSWORD || "",
    },
  });
  return transporter;
}

export async function sendMarketingEmail({ to, subject, html, replyTo }: { to: string; subject: string; html: string; replyTo?: string }) {
  const t = getTransporter();
  await t.sendMail({
    from: process.env.MARKETING_EMAIL_USER || "",
    to,
    subject,
    html,
    replyTo,
  });
}

export async function readMarketingInbox({ since, user, password }: { since?: Date; user?: string; password?: string } = {}) {
  return new Promise<any[]>((resolve, reject) => {
    const imap = new Imap({
      // Read from the mailbox replies actually land in. Caller can override the
      // creds (e.g. Lynda's inbox) instead of the default marketing mailbox.
      user: user || process.env.MARKETING_EMAIL_USER || "",
      password: password || process.env.MARKETING_EMAIL_PASSWORD || "",
      host: "mail.privateemail.com",
      port: 993,
      tls: true,
    });

    const messages: any[] = [];

    imap.once("ready", () => {
      imap.openBox("INBOX", false, () => {
        const criteria: any[] = ["UNSEEN"];
        if (since) criteria.push(["SINCE", since]);
        const fetcher = imap.search(criteria, (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }
          if (!results.length) {
            imap.end();
            return resolve([]);
          }
          const f = imap.fetch(results, { bodies: "", markSeen: true });
          f.on("message", (msg: any) => {
            let body = "";
            let uid: number | null = null;
            msg.on("attributes", (attrs: any) => { uid = attrs.uid; });
            msg.on("body", (stream: any) => {
              stream.on("data", (chunk: Buffer) => { body += chunk.toString("utf8"); });
            });
            msg.on("end", () => {
              messages.push({ uid, raw: body });
            });
          });
          f.once("error", reject);
          f.once("end", () => {
            imap.end();
            resolve(messages);
          });
        });
      });
    });
    imap.once("error", reject);
    imap.connect();
  });
}

export async function testMarketingInboxConnection() {
  return new Promise<void>((resolve, reject) => {
    const imap = new Imap({
      user: process.env.MARKETING_EMAIL_USER || "",
      password: process.env.MARKETING_EMAIL_PASSWORD || "",
      host: "mail.privateemail.com",
      port: 993,
      tls: true,
    });
    imap.once("ready", () => {
      imap.end();
      resolve();
    });
    imap.once("error", reject);
    imap.connect();
  });
}