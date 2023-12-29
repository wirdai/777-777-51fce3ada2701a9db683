import { app, InvocationContext, output, input } from "@azure/functions";

import * as df from "durable-functions";
import {
  ActivityHandler,
  OrchestrationContext,
  OrchestrationHandler,
} from "durable-functions";
import { Engine, EngineResult } from "json-rules-engine";
import { ServiceBusClient, ServiceBusMessage } from '@azure/service-bus';
// imports comunes
import * as https from "https";
import * as HttpModule from "../utils/HttpModule";

const connectionString = process.env["AzureQueues"];
const topicName = "outlook-forward-service"


const defineEngine = () => {
    const engine = new Engine();

    engine.addOperator("es", (factValue, jsonValue) => {
        return true;
    });
    engine.addOperator("includes", (factValue, jsonValue) => {
        return Array.isArray(factValue) && factValue.some((value: string) => value.toLocaleLowerCase() === (jsonValue as string).trim().toLocaleLowerCase());
    });

    return engine;
};

/***************************************************************************************************************************/


const runEngine: ActivityHandler = async function (
  input: any,
  context: InvocationContext
): Promise<EngineResult> {
  context.log("Iniciando procesamiento de reglas ----------------------------------------------", input);
  
  const engine = defineEngine();

  const rule0 = {
  "conditions": {
    "all": [
      {
        "any": [
          {
            "all": [
              {
                "fact": "Categoria",
                "operator": "includes",
                "value": "Jira"
              }
            ]
          },
          {
            "all": [
              {
                "fact": "Categoria",
                "operator": "includes",
                "value": "Bitbucket"
              }
            ]
          }
        ]
      },
      {
        "all": []
      }
    ]
  },
  "event": {
    "type": "Rule1",
    "params": {
      "actions": [
        {
          "type": "derivar",
          "params": {
            "to": "Pedro"
          }
        }
      ]
    }
  }
};
engine.addRule(rule0);



  const result = await engine.run(input);
  context.log("Finalizando procesamiento de reglas ----------------------------------------------", result);
  return result;
};

df.app.activity("runEngine", {
  handler: runEngine,
});

const durableOrchestrator: OrchestrationHandler = function* (
    context: OrchestrationContext
  ) {
    const outputs = [];
    const msg: any = context.df.getInput();
  context.log("Starting orchestration with input----------------------------------------------", msg);
  
  // Actividades pre engine
  msg.Categoria = yield context.df.callActivity("ModelClassification", msg.text);
  
  context.log("Starting engine processing----------------------------------------------", msg);
  // Ejecucion del engine rules
  const {
      results, // rule results for successful rules
      failureResults, // rule results for failed rules
      events, // array of successful rule events
      failureEvents, // array of failed rule events
      almanac, // Almanac instance representing the run
  } = yield context.df.callActivity("runEngine", msg);
  
  context.log("Engine processing finished----------------------------------------------", events);
  // Verificacion de resultados
  if (events.length > 0) {
      context.log("Se encontro regla exitosa ----------------------------------------------");
      const to = events[0].params.actions[0].params.to;
      yield context.df.callActivity("Derive", msg);
  } else {
      context.log("No se encontro regla exitosa ----------------------------------------------");
  }
  
  context.log("Fin de TODO----------------------------------------------");
    /**
     * Fin del codigo generado
     */
  
    return outputs;
  };
  
  df.app.orchestration("startOrchestrator", durableOrchestrator);

export async function serviceBusQueueTrigger(
  message: unknown,
  context: InvocationContext
): Promise<void> {
  context.log("Service bus queue function processed message:------------------------------------", message);
  const client = df.getClient(context);
  const instanceId: string = await client.startNew(
    "startOrchestrator",
    { input: message }
  );
  context.log(`Started orchestration with ID = '${instanceId}'.`);
}
app.serviceBusQueue("orchestrator", {
  connection: "azureQueueConnection",
  queueName: "777-777-51fce3ada2701a9db683",
  handler: serviceBusQueueTrigger,
  extraInputs: [df.input.durableClient()],
});
