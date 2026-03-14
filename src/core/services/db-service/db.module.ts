import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';

@Global()
@Module({
  providers: [
    {
      provide: DbService,
      useFactory: async () => {
        const dbService = new DbService();
        await dbService.onModuleInit();
        return dbService;
      },
    },
  ],
  exports: [DbService],
})
export class DbModule {}
