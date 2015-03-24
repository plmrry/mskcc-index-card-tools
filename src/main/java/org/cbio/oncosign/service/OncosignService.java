package org.cbio.oncosign.service;

import flexjson.JSONSerializer;
import org.apache.commons.fileupload.InvalidFileNameException;
import org.cbio.oncosign.util.IOUtil;
import org.rosuda.REngine.REXP;
import org.rosuda.REngine.REXPMismatchException;
import org.rosuda.REngine.RList;
import org.rosuda.REngine.Rserve.RConnection;
import org.rosuda.REngine.Rserve.RserveException;
import org.springframework.core.io.Resource;

import java.io.*;
import java.util.HashMap;
import java.util.Map;

/**
 * Service to retrieve result for user uploaded data as a graph.
 *
 * @author Selcuk Onur Sumer
 */
public class OncosignService
{
	public static String OUTPUT_EXTENSION = "txt";

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

	// oncosign properties file
	private Resource propsResource;

	public Resource getPropsResource()
	{
		return propsResource;
	}

	public void setPropsResource(Resource propsResource)
	{
		this.propsResource = propsResource;
	}

	private RConnection conn = null;
	protected boolean reloadData = true;

	public void copyFileContent(InputStream is, String fieldName) throws IOException, InvalidFileNameException
	{
		if (!IOUtil.isValidFilename(fieldName))
		{
			throw new InvalidFileNameException(fieldName, "Invalid filename.");
		}

		String outputDir = this.getOutputDirResource().getFile().getAbsolutePath();

		BufferedReader reader = new BufferedReader(
				new InputStreamReader(is));

		BufferedWriter writer = new BufferedWriter(
				new FileWriter(outputDir + "/" + fieldName + "." + OUTPUT_EXTENSION));

		String line = null;

		while ((line = reader.readLine()) != null)
		{
			writer.write(line);
			writer.newLine();
		}

		reader.close();
		writer.close();
	}
	/**
	 * Returns the existing r connection. If connection is not init yet,
	 * initializes a new R connection with default libraries and data.
	 *
	 * @return  RConnection object
	 * @throws IOException
	 * @throws org.rosuda.REngine.Rserve.RserveException
	 */
	protected RConnection getRConn() throws IOException, RserveException
	{
		// init R connection if not init yet
		if (this.conn == null)
		{
			// init connection
			RConnection c = new RConnection();
			this.conn = c;

			// load required libraries
			c.voidEval("library(qvalue);");
			c.voidEval("library(oncosign);");

			// TODO load required source files if required
			//String functions = this.getrFunctionResource().getFile().getAbsolutePath();
			// c.voidEval("source('" + functions + "');");

			// TODO load data files
			//String pcData = this.getPcDataResource().getFile().getAbsolutePath();
			//c.voidEval("pcData <- readRDS('" + pcData + "');");
		}

		if (this.reloadData)
		{
			// TODO reload data files if required
			//this.readDataMatrix(this.conn);
		}

		return this.conn;
	}

	public String executeSea() throws REXPMismatchException, RserveException, IOException
	{
		RConnection c = this.getRConn();
		String props = this.getPropsResource().getFile().getAbsolutePath();

		RList rList = c.eval("oncosign.sea('"+ props +"');").asList();

		Map<String, REXP> map = new HashMap<>();

		// TODO need to properly convert to JSON!
		for (String key: rList.keys())
		{
			map.put(key, rList.at(key));
		}

		JSONSerializer jsonSerializer = new JSONSerializer().exclude("*.class");
		return jsonSerializer.deepSerialize(map);
	}
}
