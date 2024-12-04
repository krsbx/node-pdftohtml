import { PdfToHtml } from '../lib/index';
import {
  CommandLineParser,
  CommandLineStringParameter,
} from '@rushstack/ts-command-line';

export class NodePdfToHtml extends CommandLineParser {
  public readonly input: CommandLineStringParameter;
  public readonly output: CommandLineStringParameter;

  constructor() {
    super({
      toolFilename: 'node-pdftohtml',
      toolDescription: 'Convert PDF to HTML',
    });

    this.input = this.defineStringParameter({
      parameterLongName: '--input',
      parameterShortName: '-i',
      description: 'Input PDF file',
      argumentName: 'INPUT',
      required: true,
    });

    this.output = this.defineStringParameter({
      parameterLongName: '--output',
      parameterShortName: '-o',
      description: 'Output HTML file',
      argumentName: 'OUTPUT',
      required: true,
    });
  }

  protected async onExecute() {
    if (!this.input.value || !this.output.value) {
      throw new Error('Input and output are required!');
    }

    const pdf = new PdfToHtml(this.input.value, this.output.value, {});

    await pdf.convert();
  }
}

const cli = new NodePdfToHtml();
cli.executeAsync();
