// Frequent entries from public breach lists (SecLists, HIBP top lists), lowercase.
// Only passwords of 10+ characters are listed: anything shorter already fails
// the length rule. Keep it small, the sign-up form bundles this file.
export const COMMON_PASSWORDS = new Set([
  '1234567890', '0123456789', '0987654321', '9876543210', '1111111111',
  '0000000000', '1234512345', '1122334455', '1212121212', '1234554321',
  '12345678910', '123456789a', 'a123456789', '123456789q', 'q123456789',
  '1q2w3e4r5t', '1q2w3e4r5t6y', 'q1w2e3r4t5', 'q1w2e3r4t5y6', '1qaz2wsx3edc',
  'qwertyuiop', 'qwertyuiop[]', 'asdfghjkl;', 'asdfghjkl1', 'zxcvbnm123',
  'qwerty1234', 'qwerty12345', 'qwerty123456', '1234qwerty', 'qwertyqwerty',
  'qazwsxedc123', 'asdfasdfasdf', 'abcdefghij', 'abcdefg123', 'abc1234567',
  'abcd123456', 'abcde12345', 'aaaaaaaaaa', 'password12', 'password123',
  'password1234', 'password12345', 'password123!', 'password1!', 'password!!',
  'passw0rd123', 'p@ssw0rd123', 'p@ssword123', 'mypassword', 'mypassword1',
  'thepassword', 'passwordpassword', 'changeme123', 'letmein123', 'letmein1234',
  'welcome123', 'welcome1234', 'welcome2024', 'welcome2025', 'welcome2026',
  'iloveyou12', 'iloveyou123', 'iloveyou1234', 'iloveyou!!', 'sunshine123',
  'princess123', 'football123', 'baseball123', 'basketball', 'basketball1',
  'superman123', 'batman1234', 'starwars123', 'pokemon123', 'monkey1234',
  'dragon1234', 'master1234', 'shadow1234', 'michael123', 'jennifer123',
  'charlie123', 'whatever123', 'trustno1234', 'computer123', 'internet123',
  'administrator', 'admin12345', 'admin123456', 'adminadmin', 'administrator1',
  'apartment1', 'apartment123', 'roommate123', 'roommates1', 'helloworld',
  'helloworld1', 'hello12345', 'loveyou123', 'freedom123', 'summer2024',
  'summer2025', 'summer2026', 'spring2026', 'autumn2026', 'winter2026',
  'fall2026!!', 'gainesville', 'gogators123', 'gators1234', 'chicken123'
])
