import * as df from 'durable-functions';
import { InvocationContext, output, input } from "@azure/functions";
import { ActivityHandler } from 'durable-functions';
import { ServiceBusClient, ServiceBusMessage } from '@azure/service-bus';

const connectionString = process.env["azureQueueConnection"];
const topicName = "outlook-forward-service"

const Derive: ActivityHandler = async function (
    input: any,
    context: InvocationContext,
) {
    context.log("azure connection: " + connectionString)
    context.log("Enviando mensaje-------------------------------------------------", input)
    const serviceBusClient = new ServiceBusClient(connectionString);
    const sender = serviceBusClient.createSender(topicName);

    try {
        // Convert data to bytes or use a serializer based on your data format
        const message: ServiceBusMessage = {
            body: input,
            subject: "devel"
        };

        await sender.sendMessages(message);
        context.log(`Data sent to the Service Bus queue--------------------------------------`);
    }
    finally {
        await sender.close();
        await serviceBusClient.close();
    }
    context.log("FIN Enviando mensaje-------------------------------------------------")
}

df.app.activity("Derive", {
    handler: Derive
});


