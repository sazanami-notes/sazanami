import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

const GMAIL_USER = env.GMAIL_USER;
const GMAIL_PASS = env.GMAIL_PASS;
const APP_URL = env.APP_URL as string;

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

export async function sendVerificationEmail(user: {name: string; email: string}, url: string) {
    const username = user.name || '';
    const subject = '【Sazanami】メールアドレスの確認';
    const text = `こんにちは ${username}。

メールアドレスを確認するには、以下のリンクをクリックしてください：\n${url}

もしこの操作に心当たりがない場合は、このメールを無視してください。`;

    const html = `<p>こんにちは ${username}。</p>
    <p>以下のボタンをクリックしてメールアドレスを確認してください。</p>
    <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">メールアドレスを確認する</a></p>
    <p>リンクが機能しない場合はこちらの URL をコピーしてブラウザに貼り付けてください：</p>
    <p>${url}</p>
    <p>もしこの操作に心当たりがない場合は、このメールを無視してください。</p>`;

    const mailOptions = {
        from: `"Sazanami" <${GMAIL_USER}>`,
        to: user.email,
        subject,
        text,
        html
    };
    const info = await transporter.sendMail(mailOptions);
    return info;
}

export default transporter;
