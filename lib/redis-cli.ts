import * as redis from 'redis';
import * as bb from 'bluebird';
import * as utils from './utils';

export interface ClientConfig extends redis.ClientOpts {
}

export type RedisPrimitives = string | number | boolean | Buffer;

export interface RedisParser<F, T> {
    (v: F): T
    (v: F): Promise<T>
}

export interface RedisScanResult {
    cursor: number;
    values: string[];
}

interface RedisMultiKey {
    keys(pattern: string): Promise<string[]>;
    migrate(): any;
    move(db: string): any;
}

export interface RedisKey {
    readonly key: string;
    child(path: string, sep?: string): RedisKeyAny;
    del(): Promise<void>;
    dump(): Promise<Buffer>;
    // multikey
    exists(): Promise<boolean>;
    expire(seconds: number): Promise<boolean>;
    expireAt(timestamp: number): Promise<boolean>;
    // type
}

export interface RedisKeyString extends RedisKey {
    get(): Promise<string>
    set(value: RedisPrimitives): Promise<void>;
    incr(): Promise<number>;
    incrby(value: number): Promise<number>;
    incrbyFloat(value: number): Promise<number>;
}

export interface RedisKeySet extends RedisKey {
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
    sscan(cursor: string, pattern?: string, count?: number): Promise<RedisScanResult>;
    sunion(...keys: (RedisKey | string)[]): Promise<Set<string>>;
    sunionstore(...keys: (RedisKey | string)[]): Promise<number>;
}

export interface RedisKeyHash extends RedisKey {
    hdel(...fields: string[]): Promise<number>;
    hexist(field: string): Promise<boolean>;
    hget(field: string): Promise<string>;
    hgetall(): Promise<{[field: string]: string}>
    hincrby(field: string, by: number): Promise<number>;
    hincrbyfloat(field: string, by: number): Promise<number>;
    hkeys(): Promise<string[]>;
    hlen(): Promise<number>;
    hmget(...fields: string[]): Promise<string[]>;
    hmgetDict(...fields: string[]): Promise<{[key: string]: string}>
    hmset(...data: RedisPrimitives[]): Promise<boolean>;
    hmsetDict(data: {[field: string]: RedisPrimitives}): Promise<boolean>;
    hset(field: string, value: RedisPrimitives): Promise<boolean>;
    hsetnx(field: string, value: RedisPrimitives): Promise<boolean>;
    hstrlen(field: string): Promise<number>;
    hvals(): Promise<string[]>;
    hscan(cursor: string, pattern?: string, count?: number): Promise<RedisScanResult>;
}

export interface RedisKeyList extends RedisKey {
    // multikey
    blpop(timeout: number): Promise<string>;
    // multikey
    brpop(timeout: number): Promise<string>;
    brpoplpush(destination: string, timeout: number): Promise<string>;
    lindex(idx: number): Promise<string>;
    linsert(prepos: 'BEFORE' | 'AFTER', pivot: RedisPrimitives, value: RedisPrimitives): Promise<number>;
    llen(): Promise<number>;
    lpush(...values: RedisPrimitives[]): Promise<number>;
    lpushx(value: RedisPrimitives): Promise<number>;
    lrange(start: number, stop: number): Promise<string[]>
    lrem(count: number, value: RedisPrimitives): Promise<number>;
    lset(idx: number, value: RedisPrimitives): Promise<boolean>;
    ltrim(start: number, stop: number): Promise<boolean>;
    lpop(): Promise<string>;
    rpoplpush(destination: string): Promise<string>;
    rpush(...values: RedisPrimitives[]): Promise<number>;
    rpushx(value: RedisPrimitives): Promise<number>;
}

export interface RedisKeyGeo {

}

export interface RedisKeyAny extends RedisKeyString, RedisKeySet, RedisKeyHash, RedisKeyList {
}

export class RedisClient implements RedisKeyAny {
    private bbClient: any;
    readonly key: string = '';

    constructor(client: any, key: string = '') {
        if (client instanceof RedisClient) {
            this.bbClient = client.bbClient;
        }
        else if (client instanceof redis.RedisClient) {
            this.bbClient = bb.promisifyAll(client, {context: client});
        }
        else {
            const _client = redis.createClient(client);
            this.bbClient = bb.promisifyAll(_client, {context: _client});
        }
        this.key = key;
    }

    private mkKeys(keys: (RedisKey | string)[]): string[] {
        return keys.map(k => utils.isString(k) ? k as string : (k as RedisKey).key);
    }

    child(path: string, sep: string = ":"): RedisKeyAny {
        const key = this.key ? `${this.key}${sep}${path}` : path;
        return new RedisClient(this, key);
    }

    del() {
        return this.bbClient.delAsync(this.key);
    }

    dump(): Promise<Buffer> {
        return this.bbClient.dumpAsync(this.key);
    }

    exists(): Promise<boolean> {
        return this.bbClient.existsAsync(this.key).then(utils.asBoolean);
    }

    expire(seconds: number): Promise<boolean> {
        return this.bbClient.expireAsync(this.key, seconds).then(utils.asBoolean);
    }

    expireAt(timestamp: number): Promise<boolean> {
        return this.bbClient.expireAtAsync(this.key, timestamp).then(utils.asBoolean);
    }

    // #region Strings
    get(): Promise<string> {
        return this.bbClient.getAsync(this.key);
    }

    set(value: RedisPrimitives): Promise<void> {
        return this.bbClient.setAsync(this.key, value);
    }

    incr(): Promise<number> {
        return this.bbClient.incrAsync(this.key);
    }

    incrby(val: number): Promise<number> {
        return this.bbClient.incrByAsync(this.key, val);
    }

    incrbyFloat(val: number): Promise<number> {
        return this.bbClient.incrAsync(this.key, val);
    }
    // #endregion

    // #region Sets
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
        return this.bbClient.smoveAsync(this.key, destination, member).then(utils.asBoolean);
    }

    spop(count: number = 1): Promise<string[]> {
        return this.bbClient.spopAsync(this.key, count)
    }

    spopOne(): Promise<string> {
        return this.bbClient.spopAsync(this.key);
    }

    srandmember(count: number = 1): Promise<string[]> {
        return this.bbClient.srandmemberAsync(this.key, count);
    }

    srandOneMember(): Promise<string> {
        return this.bbClient.srandmemberAsync(this.key);
    }

    srem(...members: RedisPrimitives[]): Promise<number> {
        return this.bbClient.sremAsync(this.key, ...members);
    }

    sscan(cursor: string, pattern?: string, count?: number): Promise<RedisScanResult> {
        const args: any[] = [cursor];
        pattern !== undefined && args.push('MATCH'), args.push(pattern as string);
        count !== undefined && args.push('COUNT'), args.push(count as number);
        
        return this.bbClient.sscanAsync(this.key, ...args).then((resp: any) => {
            return {
                cursor: utils.parseIntNull(resp[0]),
                valuse: resp[1]
            }
        });
    }

    sunion(...keys: (RedisKey | string)[]): Promise<Set<string>> {
        return this.bbClient.sunionAsync(this.key, ...this.mkKeys(keys)).then((mems: string[]) => new Set(mems));
    }

    sunionstore(...keys: (RedisKey | string)[]): Promise<number> {
        return this.bbClient.sunionstoreAsync(this.key, ...this.mkKeys(keys));
    }
    // #endregion

    // #region Hashes
    hdel(...fields: string[]): Promise<number> {
        return this.bbClient.hdelAsync(this.key, ...fields);
    }

    hexist(field: string): Promise<boolean> {
        return this.bbClient.hexistAsync(this.key, field).then(utils.asBoolean);
    }

    hget(field: string): Promise<string> {
        return this.bbClient.hgetAsync(this.key, field);
    }
    
    hgetall(): Promise<{[field: string]: string}> {
        return this.bbClient.hgetallAsync(this.key).then(utils.asDictionary);
    }
            
    hincrby(field: string, by: number): Promise<number> {
        return this.bbClient.hincrbyAsync(this.key, field, by);
    }

    hincrbyfloat(field: string, by: number): Promise<number> {
        return this.bbClient.hincrbyfloatAsync(this.key, field, by);
    }
    
    hkeys(): Promise<string[]> {
        return this.bbClient.hkeysAsync(this.key);
    }

    hlen(): Promise<number> {
        return this.bbClient.hlenAsync(this.key);
    }

    hmget(...fields: string[]): Promise<string[]> {
        return this.bbClient.hmgetAsync(this.key, ...fields);
    }
    
    hmgetDict(...fields: string[]): Promise<{[key: string]: string}> {
        return this.hmget(...fields).then(vals => {
            const dict: {[key: string]: string} = {};
            for (let i = 0; i < fields.length; ++i) {
                dict[fields[i]] = vals[i];
            }
            return dict;
        })
    }

    hmset(...data: RedisPrimitives[]): Promise<boolean> {
        return this.bbClient.hmsetAsync(this.key, ...data).then(utils.asBoolean);
    }
    
    hmsetDict(data: {[field: string]: RedisPrimitives}): Promise<boolean> {
        const args: any[] = [];
        for (const field in data) {
            args.push(field);
            args.push(data[field]);
        }

        return this.hmset(...args);
    }
    
    hset(field: string, value: RedisPrimitives): Promise<boolean> {
        return this.bbClient.hsetAsync(this.key, field, value).then(utils.asBoolean);
    }
    
    hsetnx(field: string, value: RedisPrimitives): Promise<boolean> {
        return this.bbClient.hsetnxAsync(this.key, field, value).then(utils.asBoolean);
    }
    
    hstrlen(field: string): Promise<number> {
        return this.bbClient.hstrlenAsync(this.key, field);
    }
    
    hvals(): Promise<string[]> {
        return this.bbClient.hvalsAsync(this.key);
    }
    
    hscan(cursor: string, pattern?: string, count?: number): Promise<RedisScanResult> {
        const args: any[] = [cursor];
        pattern !== undefined && args.push('MATCH'), args.push(pattern as string);
        count !== undefined && args.push('COUNT'), args.push(count as number);
        
        return this.bbClient.hscanAsync(this.key, ...args).then((resp: any) => {
            return {
                cursor: utils.parseIntNull(resp[0]),
                valuse: resp[1]
            }
        });
    }
    
    // #endregion

    // #region Lists
    blpop(timeout: number): Promise<string> {
        return this.bbClient.blpopAsync(this.key, timeout);
    }

    brpop(timeout: number): Promise<string> {
        return this.bbClient.brpopAsync(this.key, timeout);
    }
    
    brpoplpush(destination: string, timeout: number): Promise<string> {
        return this.bbClient.brpoplpushAsync(this.key, destination, timeout);
    }

    lindex(idx: number): Promise<string> {
        return this.bbClient.lindexAsync(this.key, idx);
    }

    linsert(prepos: 'BEFORE' | 'AFTER', pivot: RedisPrimitives, value: RedisPrimitives): Promise<number> {
        return this.bbClient.linsertAsync(this.key, prepos, pivot, value);
    }

    llen(): Promise<number> {
        return this.bbClient.llenAsync(this.key);
    }

    lpush(...values: RedisPrimitives[]): Promise<number> {
        return this.bbClient.lpushAsync(this.key, ...values);
    }

    lpushx(value: RedisPrimitives): Promise<number> {
        return this.bbClient.lpushxAsync(this.key, value);   
    }

    lrange(start: number, stop: number): Promise<string[]> {
        return this.bbClient.lrangeAsync(this.key, start, stop);
    }

    lrem(count: number, value: RedisPrimitives): Promise<number> {
        return this.bbClient.lremAsync(this.key, count, value);
    }

    lset(idx: number, value: RedisPrimitives): Promise<boolean> {
        return this.bbClient.lsetAsync(this.key, idx, value);
    }

    ltrim(start: number, stop: number): Promise<boolean> {
        return this.bbClient.ltrimAsync(this.key, start, stop);
    }

    lpop(): Promise<string> {
        return this.bbClient.lpopAsync(this.key);
    }

    rpoplpush(destination: string): Promise<string> {
        return this.bbClient.rpoplpushAsync(this.key, destination);
    }

    rpush(...values: RedisPrimitives[]): Promise<number> {
        return this.bbClient.rpushAsync(this.key, ...values);
    }

    rpushx(value: RedisPrimitives): Promise<number> {
        return this.bbClient.rpushx(this.key, value);
    }

    // #endregion
}