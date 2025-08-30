import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: "*"
  })
  app.useGlobalPipes(new ValidationPipe({whitelist: true, transform: true}))
  await app.listen(process.env.SERVER_PORT ?? 3000);

  // const serverUrl = process.env.API_BASE_URL // ← здесь получаешь URL
  // console.log(`Server running on: ${serverUrl}`);

  // const trelloKey = process.env.TRELLO_KEY;
  // const trelloToken = process.env.TRELLO_TOKEN;
  // const trelloModelId = process.env.TRELLO_BOARD_ID; // или idList

  // try {
  //   await axios.post(`https://api.trello.com/1/webhooks?key=${trelloKey}&token=${trelloToken}`, {
  //     description: 'My Trello Webhook',
  //     callbackURL: `${serverUrl}/webhook/trello`, // наш обработчик в контроллере
  //     idModel: trelloModelId
  //   });
  //   console.log('Trello webhook created successfully');
  // } catch (error) {
  //   console.error('Error creating Trello webhook:', error.response?.data || error.message);
  // }
}
bootstrap();
