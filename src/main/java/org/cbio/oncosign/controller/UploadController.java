package org.cbio.oncosign.controller;

import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.cbio.oncosign.service.OncosignService;
import org.rosuda.REngine.Rserve.RConnection;
import org.rosuda.REngine.Rserve.RserveException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.List;

@Controller
@RequestMapping("/upload")
public class UploadController
{
	@Autowired
	OncosignService oncosignService;

	public OncosignService getOncosignService()
	{
		return oncosignService;
	}

	public void setOncosignService(OncosignService oncosignService)
	{
		this.oncosignService = oncosignService;
	}

	private RConnection conn = null;
	protected boolean reloadData = true;

	@RequestMapping(value = "file/",
	                method = {RequestMethod.POST},
	                headers = "Accept=multipart/form-data")
	public ResponseEntity<String> uploadFile(HttpServletRequest request,
			HttpServletResponse response)
	{
		HttpHeaders headers = new HttpHeaders();

		try
		{
			List<FileItem> items =
				new ServletFileUpload(new DiskFileItemFactory()).parseRequest(request);

			Iterator<FileItem> iter = items.iterator();

			String result = "NA";

			// TODO process each file: write contents to outputDir and then pass them to R!
			while (iter.hasNext())
			{
				FileItem item = iter.next();
				String fieldName = item.getFieldName();

				if (item.getSize() == 0)
				{
					return new ResponseEntity<String>("Empty file.", headers, HttpStatus.BAD_REQUEST);
				}

				InputStream contentStream = item.getInputStream();

				try {
					//result = this.getUploadContextService().getStudyData(method, size, contentStream);
				} catch (Exception e) {
					return new ResponseEntity<String>(e.getMessage(), headers, HttpStatus.BAD_REQUEST);
				}
			}

			return new ResponseEntity<String>(result, headers, HttpStatus.OK);
		}
		catch (IOException e)
		{
			return new ResponseEntity<String>("IO error.", headers, HttpStatus.BAD_REQUEST);
		}
		catch (FileUploadException e)
		{
			return new ResponseEntity<String>("File upload error.", headers, HttpStatus.BAD_REQUEST);
		}
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
}
