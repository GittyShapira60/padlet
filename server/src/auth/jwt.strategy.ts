import { Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { PassportStrategy } from '@nestjs/passport'
import { Model } from 'mongoose'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { User, UserDocument } from '../entities'

interface JwtPayload {
  sub: string
  username: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private users: Model<UserDocument>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'secret',
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.users.findOne({ _id: payload.sub })
    if (!user) throw new UnauthorizedException()
    return user
  }
}
