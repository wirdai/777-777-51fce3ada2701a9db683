// imports comunes
import * as https from "https";
import * as df from 'durable-functions';
import * as HttpModule from "../utils/HttpModule";
import { InvocationContext } from "@azure/functions";
import { ActivityHandler } from 'durable-functions';

const ModelClassification: ActivityHandler = async function (
    input: string, 
    context: InvocationContext,
): Promise<String[]> {
    context.log("TypeScript Activity. ModelClassification")

    const nlpEndpoint = "https://api.wholemeaning.com/api/v1/model/tester";
    const nlpToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiI4NEJiRXdrVG02Mm9PQ1Brd24wQ0gxSmJMeDJ2aEFpMSIsIm1vZGVsIjoxMzE0LCJsYW5ndWFnZSI6ImVzIiwiY3VzdG9tZXIiOjYzfQ.NEDfusL945y1rWf7wqOSG1m-HAAAeGqanmSXSzHRpoA"; // Replace with your actual access token

    const requestOptions: https.RequestOptions = {
        method: "POST",
        headers: {
            Authorization: `Bearer ${nlpToken}`,
            "Content-Type": "application/json"
        }
    };

    const postData = JSON.stringify({
        text: input
    });

    const response = await HttpModule.sendHttpRequest(nlpEndpoint, postData, requestOptions);
    const classifications = JSON.parse(response.toString())["classifications"];
    return classifications.flatMap(classif => classif.classes.map(classInfo => classInfo.name.toLowerCase()));
};

df.app.activity("ModelClassification", {
    handler: ModelClassification
});