import { UserEntity } from 'src/users/entities/user.entity';
import { PointsService } from './../points/points.service';
import { Injectable } from "@nestjs/common";
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FeedbackEntity } from './entities/feedback.entity';

@Injectable()
export class FeedbacksService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,

        @InjectRepository(FeedbackEntity)
        private readonly feedbackRepository: Repository<FeedbackEntity>,

        private readonly pointsService: PointsService
    ){}

    
}