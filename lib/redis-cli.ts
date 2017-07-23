import * as redis from 'redis';
import * as bb from 'bluebird';
import * as utils from './utils';

interface ClientConfig extends redis.ClientOpts {
}

type RedisPrimitives = string | number | boolean | Buffer;

interface RedisParser<F, T> {
    (v: F): T
    (v: F): Promise<T>
}

interface RedisKey {
    readonly key: string;
    child(path: string, sep?: string): RedisKeyAny;
    del(): Promise<void>;
}

interface RedisKeyString extends RedisKey {
    get(): Promise<string>
    set(value: RedisPrimitives): Promise<void>;
}

interface RedisKeySet extends RedisKey {
    sadd(...values: RedisPrimitives[]): Promise<number>;
    scard(): Promise<number>;
    sdiff(...keys: (RedisKey | string)[]): Promise<Set<string>>;
    sdiffstore(...keys: (RedisKey | string)[]): Promise<number>;
    sinter(...keys: (RedisKey | string)[]): Promise<Set<string>>;
    sinterstore(...keys: (RedisKey | string)[]): Promise<number>;
    sismember(member: RedisPrimitives): Promise<boolean>;
    smembers(): Promise<Set<string>>
    smove(destination: (RedisKey | string), member: RedisPrimitives): Promise<boolean>;
    spop(count?: number): Promise<string[]>;
    spopOne(): Promise<string>;
    srandmember(count?: number): Promise<string[]>;
    srandOneMember(): Promise<string>;
    srem(...members: RedisPrimitives[]): Promise<number>;
    sscan(cursor: string, pattern?: string, count?: number): Promise<string[]>;
    sunion(...keys: (RedisKey | string)[]): Promise<Set<string>>;
    sunionstore(...keys: (RedisKey | string)[]): Promise<number>;
}

interface RedisKeyAny extends RedisKeyString, RedisKeySet {

}

export class RedisClient implements RedisKeyAny {
    private bbClient: any;
    readonly key: string = '';

    constructor(client: any, key: string) {
        this.bbClient = client;
        this.key = key;
    }

    private mkKeys(keys: (RedisKey | string)[]): string[] {
        return keys.map(k => utils.isString(k) ? k as string : (k as RedisKey).key);
    }

    child(path: string, sep: string = ":"): RedisKeyAny {
        const key = `${this.key}${sep}${path}`;
        return new RedisClient(this.bbClient, key);
    }

    del() {
        return this.bbClient.delAsync(this.key);
    }

    get(): Promise<string> {
        return this.bbClient.getAsync(this.key);
    }

    set(value: RedisPrimitives): Promise<void> {
        return this.bbClient.setAsync(this.key, value);
    }

    sadd(...values: RedisPrimitives[]): Promise<number> {
        return this.bbClient.saddAsync(this.key, ...values);
    }

    scard(): Promise<number> {
        return this.bbClient.scardAsync(this.key);
    }

    sdiff(...keys: (RedisKey | string)[]): Promise<Set<string>> {
        return this.bbClient.sdiffAsync(this.key, ...this.mkKeys(keys)).then((mems: string) => new Set(mems));
    }

    sdiffstore(...keys: (RedisKey | string)[]): Promise<number> {
        return this.bbClient.sdiffstoreAsync(this.key, ...this.mkKeys(keys));
    }

    sinter(...keys: (RedisKey | string)[]): Promise<Set<string>> {
        return this.bbClient.sinterAsync(this.key, ...this.mkKeys(keys)).then((mems: string) => new Set(mems));
    }

    sinterstore(...keys: (RedisKey | string)[]): Promise<number> {
        return this.bbClient.sdiffstoreAsync(this.key, ...this.mkKeys(keys));
    }

    sismember(member: RedisPrimitives): Promise<boolean> {
        return this.bbClient.sismemberAsync(this.key, member).then(utils.asBoolean);
    }

    smembers(): Promise<Set<string>> {
        return this.bbClient.smembersAsync(this.key).then((mems: string[]) => new Set(mems));
    }

    smove(destination: (RedisKey | string), member: RedisPrimitives): Promise<boolean> {
        return this.bbClient.smoveAsync(destination, member).then(utils.asBoolean);
    }

    spop(count?: number): Promise<string[]> {
        return count ? this.bbClient.spopAsync(this.key, count) : this.bbClient.spopAsync(this.key);
    }

    spopOne(): Promise<string> {
        return this.spop().then(utils.first);
    }

    srandmember(count?: number): Promise<string[]> {
        return count ? this.bbClient.srandmemberAsync(this.key, count) : this.bbClient.srandmemberAsync(this.key, count);
    }

    srandOneMember(): Promise<string> {
        return this.srandmember().then(utils.first);
    }

    srem(...members: RedisPrimitives[]): Promise<number> {
        return this.bbClient.sremAsync(this.key, ...members);
    }

    sscan(cursor: string, pattern?: string, count?: number): Promise<string[]> {
        const args: any[] = [cursor];
        pattern !== undefined && args.push('MATCH'), args.push(pattern as string);
        count !== undefined && args.push('COUNT'), args.push(count as number);
        
        return this.bbClient.sscanAsync(this.key, ...args);
    }

    sunion(...keys: (RedisKey | string)[]): Promise<Set<string>> {
        return this.bbClient.sunionAsync(this.key, ...this.mkKeys(keys)).then((mems: string) => new Set(mems));
    }

    sunionstore(...keys: (RedisKey | string)[]): Promise<number> {
        return this.bbClient.sunionstoreAsync(this.key, ...this.mkKeys(keys));
    }
}