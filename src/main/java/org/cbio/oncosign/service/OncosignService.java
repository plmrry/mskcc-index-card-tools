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

	/**
	 * Copies the contents of the given (uploaded) file into the specified
	 * directory (this.outputDirResource).
	 *
	 * @param is        input stream for the uploaded file
	 * @param fieldName name of the file to be created
	 * @throws IOException
	 * @throws InvalidFileNameException
	 */
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

	/**
	 * Executes the oncosign.sea() function for the current settings.
	 *
	 * @return oncosign function return value as a JSON string
	 * @throws REXPMismatchException
	 * @throws RserveException
	 * @throws IOException
	 */
	public String executeSea() throws REXPMismatchException, RserveException, IOException
	{
		RConnection c = this.getRConn();
		String props = this.getPropsResource().getFile().getAbsolutePath();

		REXP rExp = c.eval("oncosign.sea('" + props + "');");

		Object obj = extractRExp(rExp);

		// serialize the java object into a JSON
		JSONSerializer jsonSerializer = new JSONSerializer().exclude("*.class");
		return jsonSerializer.deepSerialize(obj);
	}

	/**
	 * Extracts the contents of given REXP object as a plain java object.
	 *
	 * @param rExp  raw REXP result from RServe
	 * @return      plain java object
	 * @throws REXPMismatchException
	 */
	public Object extractRExp(REXP rExp) throws REXPMismatchException
	{
		Object value;

		// do a recursive call for lists
		if (rExp.isList())
		{
			RList rList = rExp.asList();
			Map<String, Object> map = new HashMap<>();

			for (String key: rList.keys())
			{
				map.put(key, extractRExp(rList.at(key)));
			}

			value = map;
		}
		// rest is straight forward...
		else if (rExp.isVector())
		{
			value = rExp.asNativeJavaObject();
		}
		else if (rExp.isFactor())
		{
			value = rExp.asFactor();
		}
		else if (rExp.isInteger())
		{
			value = rExp.asInteger();
		}
		else if (rExp.isString())
		{
			value = rExp.asString();
		}
		else
		{
			value = rExp.asNativeJavaObject();
		}

		return value;
	}
}
