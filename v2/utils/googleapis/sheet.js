const { google } = require("googleapis");
const authClient = require("./auth");

const service = google.sheets("v4");

const getQuizResponse = async (spreadsheetId) => {
    const response = await service.spreadsheets.values.get({
        auth: await authClient(),
        // spreadsheetId: "1bvHPUxjbmGRmfUAxdnGQ836qv4yk670DoaQXJhnOS1U",
        // spreadsheetId: "1NdJOgtlq030C__p5_8gJjjXLG12R_DBB_AHq-R9ChN0",
        spreadsheetId,
        range: "A:Z",
    });

    return response.data.values
}

async function checkResult(quiz, email) {
    console.log(quiz, 'checking result');
    const { sheet_id } = quiz;
    const authClient = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        ["https://www.googleapis.com/auth/spreadsheets"]
    );
    // const authClient = new google.auth.JWT(
    //     credentials.process.env.GOOGLE_CLIENT_EMAIL,
    //     null,
    //     credentials.process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    //     ["https://www.googleapis.com/auth/spreadsheets"]
    // );

    const token = await authClient.authorize();
    // Set the client credentials
    authClient.setCredentials(token);

    // const quiz = await Quiz.findOne({ name, sheetID })

    // Get the rows
    const quizResponse = await service.spreadsheets.values.get({
        auth: authClient,
        // spreadsheetId: "1bvHPUxjbmGRmfUAxdnGQ836qv4yk670DoaQXJhnOS1U",
        // spreadsheetId: "1NdJOgtlq030C__p5_8gJjjXLG12R_DBB_AHq-R9ChN0",
        spreadsheetId: sheet_id,
        range: "A:Z",
    });

    const data = quizResponse.data.values;

    // console.log(data, 'data')

    const fin = []

    if (data.length) {
        log('datasss')

        const emailIndex = data[0].findIndex(d => d == 'Email')
        log(emailIndex)
        const scoreIndex = data[0].findIndex(d => d == 'Score')
        log(scoreIndex)

        // data.shift();

        for (let d of data) {
            fin.push({ email: d[emailIndex], score: d[scoreIndex] })
        }

        console.log(fin, 'fin')
    }

    const result = fin.find(data => data.email === email);

    return result;
}

module.exports = { getQuizResponse };


// [
//     [
//       'Timestamp',
//       'Untitled Question',
//       'what is your name',
//       'Score',
//       'Email'
//     ],
//     [],
//     [],
//     [],
//     [],
//     [],
//     [
//       '1/17/2024 8:34:02',
//       'Option 1',
//       'Hudhayfah',
//       '10 / 10',
//       'hoismail1430@gmail.com'
//     ],
//     [ '1/17/2024 8:35:19', '', 'j', '0 / 10', 'h' ]
//   ] data
//   datasss
//   4
//   3
//   [
//     { email: 'Email', score: 'Score' },
//     { email: undefined, score: undefined },
//     { email: undefined, score: undefined },
//     { email: undefined, score: undefined },
//     { email: undefined, score: undefined },
//     { email: undefined, score: undefined },
//     { email: 'hoismail1430@gmail.com', score: '10 / 10' },
//     { email: 'h', score: '0 / 10' }
//   ] fin