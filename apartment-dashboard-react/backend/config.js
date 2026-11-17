// Variables the server cannot run safely without in production. A default JWT secret
// or a fallback database would let a misconfigured deploy start and look healthy.
const REQUIRED_IN_PRODUCTION = ['JWT_SECRET', 'MONGODB_URI']

/** Returns the names of the required variables that are unset or blank (none outside production). */
export const checkProductionConfig = (env) => {
  if (env.NODE_ENV !== 'production') return []
  return REQUIRED_IN_PRODUCTION.filter((name) => !env[name]?.trim())
}
