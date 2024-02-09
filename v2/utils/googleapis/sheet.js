const { google } = require("googleapis");
const authClient = require("./auth");

const service = google.sheets("v4");

const getQuizResponse = async () => {
    await service.spreadsheets.values.get({
        auth: authClient,
        // spreadsheetId: "1bvHPUxjbmGRmfUAxdnGQ836qv4yk670DoaQXJhnOS1U",
        spreadsheetId: "1NdJOgtlq030C__p5_8gJjjXLG12R_DBB_AHq-R9ChN0",
        range: "A:Z",
    }); 
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