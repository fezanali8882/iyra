declare global {
  interface Window {
    grecaptcha: any;
  }
}

export const executeRecaptcha = (action: string): Promise<string> => {
  return Promise.resolve('');
};
