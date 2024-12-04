import { spawn } from 'child_process';

export interface Options extends Record<string, unknown> {
  bin?: string;
}

export class PdfToHtml {
  /** input path to pdf file */
  public readonly input: string;
  /** output path to output html file, only support a relative path */
  public readonly output: string;
  /** Any options to pass to pdf2htmlEx, see refer to https://manpages.ubuntu.com/manpages/xenial/man1/pdf2htmlEX.1.html */
  public readonly options: Options;

  /**
   * @param input path to pdf file
   * @param output path to output html file, only support a relative path
   * @param options Any options to pass to pdf2htmlEx, see refer to https://manpages.ubuntu.com/manpages/xenial/man1/pdf2htmlEX.1.html
   */
  constructor(input: string, output: string, options: Options) {
    this.input = input;
    this.output = output;
    this.options = options;

    if (!this.options.bin) {
      this.options.bin = process.env.PDF2HTMLEX_BIN || 'pdf2htmlEX';
    }
  }

  private constructOptions<T extends Options>(...options: T[]) {
    function merge<T extends Options>(a: T, b: T) {
      return Object.assign({}, a, b);
    }

    const entries = Object.entries(
      Array.isArray(options) ? options.reduce(merge) : options
    ).filter(([key]) => key !== 'bin');

    const results: string[] = [];

    entries.forEach(([key, value]) => {
      const stringified = String(value);

      results.push(`--${key}`, stringified.replace(/ /g, '\\ '));
    });

    return results;
  }

  public async convert(
    options: Options = {
      zoom: 1.33,
      'font-format': 'woff',
    }
  ): Promise<string> {
    const convertArgs = [this.input, this.output];
    const optionsArgs = this.constructOptions(this.options, options);
    const args = [...convertArgs, ...optionsArgs];

    return new Promise((resolve, reject) => {
      if (!this.options.bin) {
        reject('PDF2HTMLEX_BIN is not set');
        return;
      }

      const instance = {
        child: spawn(this.options.bin, args),
        error: '',
      };

      instance.child.stderr.on('data', (data) => {
        instance.error += data;
      });

      instance.child.on('error', () => {
        const error = new Error(
          'Please install pdf2htmlEX from https://github.com/pdf2htmlEX/pdf2htmlEX'
        );
        error.name = 'ExecutableError';

        reject(error);
      });

      instance.child.on('close', (code) => {
        if (code === 0) {
          resolve(instance.error);
        } else {
          reject(
            new Error(
              `${this.options.bin} ran with parameters: ${args.join(
                ' '
              )} exited with an error code ${code} with following error:\n${
                instance.error
              }`
            )
          );
        }
      });
    });
  }
}
