const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SG_API_KEY);


const SG_sendMail = async (data) => {
    try {
        const { to, content, type, subject } = data;
    
        await sgMail.send({ from: 'hoismail2017@gmail.com', to, [type]: content, type, subject });

        console.log('mail sent')
    } catch (error) {
        console.log('Error sending mail')
        throw error
    }
}

const SG_sendBulkMessage = (recipients, msg, queue) => {
    console.log(recipients, 'RECIPiENT')
    console.log(queue, 'QUEUE')
    return sgMail.send({
        to: recipients,
        from: { email: 'hoismail2017@gmail.com', name: 'TRD iTems UI' },
        // from: 'Name <hoismail2017@gmail.com>',
        subject: msg.subject,
        text: msg.text,
        "send_each_at": queue
    });
};

module.exports = { SG_sendMail, SG_sendBulkMessage };