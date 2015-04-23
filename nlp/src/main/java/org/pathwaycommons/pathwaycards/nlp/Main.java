package org.pathwaycommons.pathwaycards.nlp;

import edu.arizona.sista.processors.Document;
import org.apache.commons.lang3.StringUtils;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Main
{
	public static void main(String[] args) throws Exception
	{
		// TODO improve parameter processing
		if (args.length < 3)
		{
			System.err.println("Invalid number of arguments");
			return;
		}

		String inputDir = args[0];
		Integer fileLimit = Integer.parseInt(args[1]);
		Integer lineLimit = Integer.parseInt(args[2]);

		List<File> files = getFiles(inputDir);
		List<File> subList = files.subList(0, fileLimit);

		NLPProcessor processor = new NLPProcessor();
		//processor.printSummary(processor.process("MDM2 binds TP53."));

		for (File article: subList)
		{
			List<String> lines = getLines(article, lineLimit);

			String text = StringUtils.join(lines, '\n');
			System.out.println("[" + new Date() + "] Processing: " + article.getName());
			Document doc = processor.process(text);
			processor.printSummary(doc);
		}
	}

	public static List<String> getLines(File article, Integer lineLimit) throws IOException
	{
		BufferedReader reader = new BufferedReader(new FileReader(article));
		List<String> lines = new ArrayList<String>();

		String line = null;

		while ((line = reader.readLine()) != null)
		{
			if (line.trim().length() == 0)
			{
				// skip empty lines
				continue;
			}

			if (lines.size() == lineLimit)
			{
				// stop when reached the limit
				break;
			}

			lines.add(line);
		}

		return lines;
	}


	public static List<File> getFiles(String sourceDir)
	{
		File inFile = new File(sourceDir);

		List<File> fileList = null;

		if (inFile.isDirectory())
		{
			fileList = processDir(inFile);
		}

		return fileList;
	}

	/**
	 * Recursively processes the given input directory and creates a
	 * list of files under its all subdirectories.
	 *
	 * @param inFile    input directory
	 * @return          list of all files under the given directory
	 */
	public static List<File> processDir(File inFile)
	{
		// TODO filter
		List<File> fileList = new ArrayList<File>();
		File[] contentList;

		if (inFile.isDirectory())
		{
			contentList = inFile.listFiles();

			if (contentList != null)
			{
				for (File file : contentList)
				{
					if (file.isDirectory())
					{
						fileList.addAll(processDir(file));
					}
					else
					{
						fileList.add(file);
					}
				}
			}
		}

		return fileList;
	}
}
