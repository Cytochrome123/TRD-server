import nodemailer from 'nodemailer';

// const transporter = nodemailer.createTransport({
//     // host: "smtp.forwardemail.net",
//     // port: 465,
//     // secure: true,
//     service: "gmail",
//     auth: {
//         // TODO: replace `user` and `pass` values from <https://forwardemail.net>
//         user: "hoismail2017@gmail.com",
//         // pass: "0d6fe4b9793a9613333cc779",
//         pass: "ehks vzhl ctxv qsqc",
//     },
// });
const transporter = nodemailer.createTransport({
    host: "mail.codesquad.co",
    port: 465,
    secure: true,
    auth: {
        user: "ismail@codesquad.co",
        pass: "NPc#,Uz5cofn",
    },
});

export interface MailData {
    to: string | string[];
    type: 'html' | 'text',
    content: string;
    subject: string;
}

export const sendMail = async (data: MailData) => {
    const { to, content, type, subject } = data;
    try {
        const sent = await transporter.sendMail({
            to, from: "ismail@codesquad.co", subject, html: type === 'html' ? content : `<p>${content}</p>`
        })

        if(sent) console.log(sent.accepted);
        
    } catch (error) {
        console.error(error);
    }
}
