package org.cbio.oncosign.service;

import org.rosuda.REngine.REXPMismatchException;
import org.rosuda.REngine.Rserve.RConnection;
import org.rosuda.REngine.Rserve.RserveException;
import org.springframework.core.io.Resource;

import java.io.*;

/**
 * Service to retrieve result for user uploaded data as a graph.
 *
 * @author Selcuk Onur Sumer
 */
public class OncosignService
{
	public static String OUTPUT_FILENAME = "captonviz_upload.txt";

	// source directory for temporary file output
	private Resource outputDirResource;

	public Resource getOutputDirResource()
	{
		return outputDirResource;
	}

	public void setOutputDirResource(Resource outputDirResource)
	{
		this.outputDirResource = outputDirResource;
	}

	/**
	 * Reads data matrix user input.
	 *
	 * @param c RConnection
	 * @throws java.io.IOException
	 * @throws org.rosuda.REngine.Rserve.RserveException
	 */
	protected void readDataMatrix(RConnection c) throws IOException, RserveException
	{
		String dataFile = this.getOutputDirResource().getFile().getAbsolutePath() +
		                  "/" + OUTPUT_FILENAME;

		c.voidEval("uploadedData <- read.csv('" + dataFile + "', header=TRUE, sep='\t');");
		c.voidEval("dataMatrix <- uploadedData[,-1];");
		c.voidEval("rownames(dataMatrix) <- uploadedData[,1];");
	}
}
