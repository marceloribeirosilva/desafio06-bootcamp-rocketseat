import csvParse from 'csv-parse';
import path from 'path';
import fs from 'fs';
import CreateTransactionService from './CreateTransactionService';
import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';

interface Request {
  csvFileName: string;
}

interface LoadCSVTransactionDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

async function loadCSVTransaction(
  csvFilePath: string,
): Promise<LoadCSVTransactionDTO[]> {
  const readCSVStream = fs.createReadStream(csvFilePath);

  const parseStream = csvParse({
    from_line: 2,
    ltrim: true,
    rtrim: true,
  });

  const parseCSV = readCSVStream.pipe(parseStream);

  const transactionsDTO: LoadCSVTransactionDTO[] = [];

  parseCSV.on('data', line => {
    transactionsDTO.push({
      title: line[0],
      type: line[1],
      value: line[2],
      category: line[3],
    });
  });

  await new Promise(resolve => {
    parseCSV.on('end', resolve);
  });

  return transactionsDTO;
}

class ImportTransactionsService {
  async execute({ csvFileName }: Request): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    const createTransaction = new CreateTransactionService();

    const csvFilePath = path.join(uploadConfig.directory, csvFileName);

    const transactionsDTO = await loadCSVTransaction(csvFilePath);

    if (transactionsDTO) {
      await Promise.all(
        transactionsDTO.map(async transactionDTO => {
          const transaction = await createTransaction.execute({
            title: transactionDTO.title,
            type: transactionDTO.type,
            value: transactionDTO.value,
            category: transactionDTO.category,
          });
          transactions.push(transaction);
        }),
      );
    }

    return transactions;
  }
}

export default ImportTransactionsService;
