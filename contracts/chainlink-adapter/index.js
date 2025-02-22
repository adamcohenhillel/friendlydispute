const { Requester, Validator } = require('@chainlink/external-adapter');
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const customParams = {
  disputeId: ['disputeId'],
  caseA: ['caseA'],
  caseB: ['caseB'],
  partyA: ['partyA'],
  partyB: ['partyB']
}

const createRequest = async (input, callback) => {
  const validator = new Validator(callback, input, customParams);
  const jobRunID = validator.validated.id;
  const { disputeId, caseA, caseB, partyA, partyB } = validator.validated.data;

  try {
    const prompt = `
      You are an impartial arbitrator tasked with resolving a dispute between two parties.
      Please analyze both cases and determine the winner based on the merits of their arguments.
      
      Party A (${partyA}): ${caseA}
      
      Party B (${partyB}): ${caseB}
      
      Please provide your decision in the following format:
      1. Brief analysis of Party A's case
      2. Brief analysis of Party B's case
      3. Your reasoning for the decision
      4. Final decision: Choose either Party A (${partyA}) or Party B (${partyB}) as the winner
    `;

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an impartial arbitrator with expertise in dispute resolution. Your task is to analyze both sides of a dispute and make a fair decision based on the merits of each case."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const analysis = completion.data.choices[0].message.content;
    const winner = analysis.toLowerCase().includes(`party a (${partyA.toLowerCase()})`) ? partyA : partyB;

    const response = {
      data: {
        winner,
        analysis,
        disputeId
      }
    };

    callback(response.status, Requester.success(jobRunID, response));
  } catch (error) {
    callback(500, Requester.errored(jobRunID, error));
  }
}

exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data);
  });
}

exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data);
  });
}

exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false
    });
  });
}

module.exports.createRequest = createRequest; 