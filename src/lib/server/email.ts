import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

const GMAIL_USER = env.GMAIL_USER;
const GMAIL_PASS = env.GMAIL_PASS;

if (!GMAIL_USER || !GMAIL_PASS) {
    console.warn('Gmail credentials not set (GMAIL_USER / GMAIL_PASS). Email sending will fail.');
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
    }
});

export async function sendEmail(to: string, subject: string, text: string, html: string) {
    if (!GMAIL_USER || !GMAIL_PASS) {
        console.log('================================================================');
        console.log('Email sending is disabled (no credentials). Logging email instead:');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Text Body:\n${text}`);
        console.log('================================================================');
        return Promise.resolve({ messageId: 'mock-id' });
    }

    const mailOptions = {
        from: `"Sazanami" <${GMAIL_USER}>`,
        to,
        subject,
        text,
        html
    };
    const info = await transporter.sendMail(mailOptions);
    return info;
}

export async function sendVerificationEmail(user: { name: string; email: string }, url: string) {
    const username = user.name || '';
    const subject = '【Sazanami】メールアドレスの確認';
    const text = `こんにちは ${username}。\n`
        + `メールアドレスを確認するには、以下のリンクをクリックしてください：\n`
        + `${url}\n`
        + `もしこの操作に心当たりがない場合は、このメールを無視してください。`;

    const html = `
        <p>こんにちは ${username}。</p>
        <p>以下のボタンをクリックしてメールアドレスを確認してください。</p>
        <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">メールアドレスを確認する</a></p>
        <p>リンクが機能しない場合はこちらの URL をコピーしてブラウザに貼り付けてください：</p>
        <p>${url}</p>
        <p>もしこの操作に心当たりがない場合は、このメールを無視してください。</p>`;

    return sendEmail(user.email, subject, text, html);
}

export async function sendMagicLink({ email, url }: { email: string, url: string }) {
    const subject = '【Sazanami】ログインしてください';
    const text = `ログインするには、以下のリンクをクリックしてください：\n`
        + `${url}\n`
        + `もしこの操作に心当たりがない場合は、このメールを無視してください。`;

    const html = `
        <p>以下のボタンをクリックしてログインしてください。</p>
        <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">ログインする</a></p>
        <p>リンクが機能しない場合はこちらの URL をコピーしてブラウザに貼り付けてください：</p>
        <p>${url}</p>
        <p>もしこの操作に心当たりがない場合は、このメールを無視してください。</p>`;

    return sendEmail(email, subject, text, html);
}

export default transporter;
