
const express=require("express")
const router=express.Router();
const BusinessDatabase=require('../models/BusinessDatabase');
const {isLoggedIn}=require("../middleware");

const FootPrintDb=require("../models/FootprintDb");
const VehicleDb=require("../models/VehicleDb");

const OpenAI = require("openai");

let domain_of_company;
let electricity;
let petrol;
let diesel;
let carbonEmission;
let standard;
let response;
let result;
let input2;

const openai = new OpenAI({
  apiKey:"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"
});
async function main(input) {

    const completion = await openai.chat.completions.create({
      messages: [{"role": "system", "content": "You are a helpful assistant."},
          {"role": "user", "content": input},
          {"role" : "assistant", "content": "give me result in json format"}
      ],
      model: "gpt-3.5-turbo",
    });
    let content = completion.choices[0].message.content;
    return content;
 }

router.post('/answer/:businessid', isLoggedIn, async function (req, res) {
  const { businessid } = req.params;
  //fetching data
  const Business = await BusinessDatabase.findById(businessid);
  console.log(Business);
  result = Business.Result;
  domain_of_company = Business.Industry;
  const id1 = Business.Carbondatabase_B;
  const id2 = Business.Carbondatabase_V;
  const FootprintDatabase = await FootPrintDb.findById(id1);
  const VehicleDatabase = await VehicleDb.findById(id2);
  electricity = FootprintDatabase.electricity;
  petrol = VehicleDatabase.petrol;
  carbonEmission = parseInt((Business.Result)) / 1000; //in tonnes
  standard = parseInt(Business.Average / 1000); //in tonnes
  //input promt
  input2 = `Act like an API. I give you a request in json format and you give me output in json format. You have to only answer in json format and nothing else! I am giving you a carbon footprint of a company which operates in field of ${domain_of_company} and you have to generate analysis and based on that you will provide actionable recommendations.
    Your output json format: {"overview":"...",analysis": "...", "performance" : "...", "recommendations": [..]}
    talk as if you are a environment specialist giving advice to a major corporation and analyze the performance of the company
    do not repeat the input values provided to you,give me at least 5 and at most 10 points which suggest how to reduce carbon footprint of this company
    give me sector -specific recommendations and answer as if you are talking to the owner of the company in first person
    each item in recommendations array must be without any serial number and should be around 3-4 lines
    Input json: {
    "electricity_kwh": ${electricity},
    "petrol_litre": ${petrol},
    "diesel_litre": ${diesel},
    "carbon_emission_per_product" : ${carbonEmission} ,
    "global_average_per_product" : ${standard}
    }`
  //generating reponse
  res.render("loader/loadingScreen", { businessid });
})


router.get("/newPage/:businessid",isLoggedIn,async(req, res)=>{
  const {businessid}=req.params;
  const Business=await BusinessDatabase.findById(businessid);
  const field=Business.Industry;
  const average=Business.Average;
  let data=await  BusinessDatabase.find({Industry:field});
  const Arr=[];
  data.forEach((i)=>{
    Arr.push((i.Result)/1000000);
  })
  console.log(Arr);
  const len=Arr.length;
  // response = JSON.parse(await main(input2));
  response = {
    overview:"overview",
    analysis: "Based on the provided data, the company's carbon footprint is significantly higher than the global average per product. This indicates that there is room for improvement in reducing the environmental impact of the company's operations in the coal industry.",
    performance: "The company's current performance in terms of carbon emissions is concerning and requires immediate attention in order to align with sustainable practices.",
    recommendations: [
      "Invest in renewable energy sources: Transitioning to renewable energy sources such as wind, solar, or hydroelectric power can significantly reduce the company's reliance on coal and consequent carbon emissions.",
      "Implement energy-efficient practices: Adopting energy-efficient technologies and practices throughout the company's operations, including the use of energy-efficient machinery and effective insulation, can help minimize electricity consumption and reduce carbon emissions.",
      'Promote employee engagement: Encourage and educate employees on the importance of sustainable practices. Implement initiatives such as carpooling or incentivize the use of public transportation to reduce reliance on petrol and diesel, thereby decreasing carbon emissions.',
      'Explore carbon capture and storage: Investigate the feasibility of implementing carbon capture and storage technologies to capture and store CO2 emissions from coal combustion, effectively reducing overall carbon footprint.',
      'Optimize supply chain: Collaborate with suppliers to evaluate their environmental practices and ensure they adhere to sustainable standards. Additionally, prioritize local suppliers to reduce transportation emissions and support the local economy.',
      'Enhance waste management strategies: Implement robust waste management practices, including recycling and proper disposal of hazardous materials, to minimize the environmental impact.',
      'Support reforestation efforts: Invest in reforestation initiatives or collaborate with environmental organizations to restore and protect natural habitats. This will help offset carbon emissions and contribute to biodiversity conservation.',
      'Engage in research and development: Allocate resources to research and develop cleaner and more efficient technologies for coal extraction, combustion, and emission reduction.',
      "Consider diversification: Explore opportunities to diversify the company's business operations by investing in renewable energy projects or transitioning into emerging low-carbon industries.",
      'Adopt carbon pricing mechanisms: Implement internal carbon pricing mechanisms to incentivize emissions reduction efforts and drive sustainable decision-making within the company.'
    ]
  } 
  res.render('AiChatbot/recommendations', { recommendations: response.recommendations, analysis: response.analysis, performance: response.performance, result, overview:response.overview,Arr,len,average});
})



module.exports=router;

