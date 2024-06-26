import { z } from '@hono/zod-openapi';
import type { EnumLike, ZodAny, ZodBoolean, ZodNativeEnum, ZodNumber, ZodObject, ZodOptional, ZodString } from 'zod';

type ZodRule = {
  /** 
   * Need to match zod function : https://zod.dev/ 
   * 
   * Example
   * ```ts
   * {
      required: false,
      type: 'string',
      name: 'email',
      rules: [
        {
          functionName: 'email',
        },
        {
          functionName: 'min',
          functionParam: 3,
        },
        {
          functionName: 'max',
          functionParam: 8,
        }
      ],
    }
   * ```
   */
  functionName: string;
  functionParam?: unknown;
};
type ZodTypeEnum = 'enum' | 'string' | 'boolean' | 'number' | 'any';
type ZodDefinition<T extends EnumLike = EnumLike> =
  | ZodBoolean
  | ZodAny
  | ZodNativeEnum<T>
  | ZodNumber
  | ZodString
  | ZodOptional<ZodDefinition>;
type OpenapiParams<T, K extends EnumLike = {}> = {
  name: T;
  required: boolean;
  example?: string | number;
  type: ZodTypeEnum;
  enum?: K;
  rules?: ZodRule[];
};
type ZodDefinitionRecord = Record<string, ZodDefinition>;
// Help generate zod schema for openApi with type safe checker
export class OpenapiFactory {
  static generateSchema<T, K = keyof T>(toGenerate: { schemaName?: string; params: OpenapiParams<K>[] }): ZodObject<ZodDefinitionRecord> {
    const shape: ZodDefinitionRecord = {};
    for (const property of toGenerate.params) {
      // Temporary variable to fix ts(2536)
      const propertyName = property.name as string;
      if (shape[propertyName]) {
        throw new Error(`Duplicate property ${propertyName} for schema ${toGenerate?.schemaName}`);
      }

      // If the property doesn't exist then handle its parameters
      shape[propertyName] = OpenapiFactory.getSchemaType(property.type, property.enum);
      if (property.rules) {
        for (const rule of property.rules) {
          shape[propertyName] = OpenapiFactory.handleSchemaRules(shape[propertyName], rule);
        }
      }

      if (property.example) {
        shape[propertyName] = shape[propertyName].openapi({
          param: {
            name: propertyName,
          },
          example: property.example,
        });
      }

      if (!property.required) {
        shape[propertyName] = shape[propertyName].optional();
      }
    }

    if (toGenerate.schemaName) {
      return z.object(shape).openapi(toGenerate.schemaName);
    }

    return z.object(shape);
  }

  private static getSchemaType<T extends EnumLike>(type: ZodTypeEnum, customEnum?: T): ZodDefinition<T> {
    switch (type) {
      case 'boolean':
        return z.boolean();
      case 'any':
        return z.any();
      case 'enum':
        if (customEnum) return z.nativeEnum(customEnum);
        else throw new Error('Missing enum parameter');
      case 'number':
        return z.number();
      case 'string':
        return z.string();
      default:
        throw new Error('unknown type');
    }
  }

  private static handleSchemaRules(zod: any, zodRule: ZodRule) {
    if (!zodRule.functionName) {
      throw new Error('functionName need to be provided');
    }
    if (zodRule.functionParam) {
      return zod[zodRule.functionName](zodRule.functionParam);
    }
    return zod[zodRule.functionName]();
  }
}
