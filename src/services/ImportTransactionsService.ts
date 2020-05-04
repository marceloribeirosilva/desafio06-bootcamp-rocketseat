import { getRepository, getCustomRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import path from 'path';
import fs from 'fs';
import uploadConfig from '../config/upload';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
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

class ImportTransactionsService {
  async execute({ csvFileName }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionRepository);

    const transactionDTO: LoadCSVTransactionDTO[] = [];
    const tmpCategories: string[] = [];

    const csvFilePath = path.join(uploadConfig.directory, csvFileName);

    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      transactionDTO.push({ title, type, value, category });
      tmpCategories.push(category);
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const uniqueCategories = tmpCategories.filter(
      (value, index, self) => self.indexOf(value) === index,
    );

    const existentCategories = await categoriesRepository.find({
      where: { title: In(uniqueCategories) },
    });

    const existentCategoriesTitle = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoriesTitle = uniqueCategories.filter(
      category => !existentCategoriesTitle.includes(category),
    );

    const newCategories = categoriesRepository.create(
      addCategoriesTitle.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const allCategories = [...existentCategories, ...newCategories];

    const transactions = transactionRepository.create(
      transactionDTO.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(transactions);

    await fs.promises.unlink(csvFilePath);

    return transactions;
  }
}

export default ImportTransactionsService;
