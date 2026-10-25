const APARTMENT_NAMES = {
  GP412: 'Gainesville Place 412',
  AL420: 'Alsander 420'
}

export const INVALID_APARTMENT_CODE = 'Invalid apartment code. Please contact your apartment administrator for a valid code.'

/**
 * Joining needs an apartment someone already lives in, or an allowlisted code for its
 * first roommate. Returns the apartment's name, or null when the code can't be joined.
 */
export const joinableApartmentName = async (User, apartmentCode) => {
  const codeUpper = apartmentCode.toUpperCase()
  const existingApartment = await User.findOne({ apartmentCode: codeUpper })
  if (existingApartment) return existingApartment.apartmentName

  const allowedFirstUser = new Set((process.env.ALLOWED_APARTMENT_CODES || 'GP412,AL420').split(',').filter(Boolean).map(c => c.toUpperCase()))
  if (!allowedFirstUser.has(codeUpper)) return null
  return APARTMENT_NAMES[codeUpper] || codeUpper
}
