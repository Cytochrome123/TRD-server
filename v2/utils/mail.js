const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SG_API_KEY);


const SG_sendMail = async (email, OTP) => {
    try {
        const msg = {
            to: email,
            from: 'hoismail2017@gmail.com',
            subject: 'Your OTP for login',
            text: `Your OTP is: ${OTP}`,
        };
    
        await sgMail.send(msg);

        console.log('mail sent')
    } catch (error) {
        console.log('Error sending mail')
        throw error
    }
}

module.exports = { SG_sendMail };